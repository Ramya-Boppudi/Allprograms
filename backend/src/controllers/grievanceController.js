const pool = require('../config/db');
const {
  publicStatusFromStage,
  stageToDbStatus,
  addEvent,
  notify,
} = require('../services/notificationService');

const HO_ROLES = ['chairman', 'ceo', 'aceo', 'cao', 'asst_secretary', 'pro'];

function canSeeAll(role) {
  return HO_ROLES.includes(role);
}

async function nextReferenceNo(conn) {
  const year = new Date().getFullYear();
  await conn.query(
    'INSERT INTO grievance_sequences (year, last_number) VALUES (?, 1) ON DUPLICATE KEY UPDATE last_number = last_number + 1',
    [year]
  );
  const [rows] = await conn.query('SELECT last_number FROM grievance_sequences WHERE year = ?', [year]);
  const num = String(rows[0].last_number).padStart(6, '0');
  return `KSBA/GRV/${year}/${num}`;
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    public_status: publicStatusFromStage(row.stage),
    sla_overdue: Boolean(
      row.due_date &&
        row.stage === 'WITH_DIVISION' &&
        new Date(`${row.due_date}T23:59:59`) < new Date()
    ),
  };
}

async function loadAttachments(grievanceId) {
  const [rows] = await pool.query(
    `SELECT id, original_name, mime_type, file_size, file_path, created_at
     FROM grievance_attachments
     WHERE grievance_id = ?
     ORDER BY id`,
    [grievanceId]
  );
  return rows;
}

async function saveAttachments(conn, grievanceId, files) {
  for (const file of files || []) {
    await conn.query(
      `INSERT INTO grievance_attachments
        (grievance_id, original_name, stored_name, mime_type, file_size, file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        grievanceId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        `/uploads/grievances/${file.filename}`,
      ]
    );
  }
}

async function loadGrievance(id) {
  const [rows] = await pool.query(
    `SELECT g.*,
            dt.name AS district_name,
            gt.name AS grievance_type_name,
            dv.name AS division_name,
            dm.name AS assigned_dm_name,
            cr.name AS created_by_name
     FROM grievances g
     JOIN districts dt ON dt.id = g.district_id
     JOIN grievance_types gt ON gt.id = g.grievance_type_id
     LEFT JOIN divisions dv ON dv.id = g.division_id
     LEFT JOIN staff_users dm ON dm.id = g.assigned_dm_id
     LEFT JOIN staff_users cr ON cr.id = g.created_by_staff_id
     WHERE g.id = ?`,
    [id]
  );
  const row = mapRow(rows[0]);
  if (row) row.attachments = await loadAttachments(row.id);
  return row;
}

function assertAccess(user, g) {
  if (canSeeAll(user.role_code)) return;
  if (user.role_code === 'divisional_manager') {
    const mine = g.assigned_dm_id === user.id || g.division_id === user.division_id || g.created_by_staff_id === user.id;
    if (!mine) {
      const err = new Error('You can only view grievances of your division');
      err.statusCode = 403;
      throw err;
    }
  }
}

exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const isStaff = Boolean(req.user);
    const {
      citizen_name, citizen_mobile, citizen_email,
      district_id, taluk, grievance_type_id, description,
    } = req.body;

    const mobile = String(citizen_mobile || req.citizen?.mobile || '').replace(/\D/g, '');
    const name = (citizen_name || req.citizen?.name || '').trim();
    const email = (citizen_email || req.citizen?.email || '').trim() || null;
    const talukName = (taluk || '').trim();
    const desc = (description || '').trim();

    if (!name || !/^[6-9]\d{9}$/.test(mobile) || !district_id || !talukName || !grievance_type_id || !desc) {
      return res.status(400).json({
        success: false,
        message: 'Name, valid mobile, district, taluk, grievance type and description are required',
      });
    }

    const isPro = isStaff && req.user.role_code === 'pro';
    const autoToPro = !isStaff;
    const initialStage = autoToPro || isPro ? 'WITH_PRO' : 'DRAFT_SAVED';
    const initialStatus = initialStage === 'DRAFT_SAVED' ? 'CREATED' : 'PENDING';

    await conn.beginTransaction();
    const reference_no = await nextReferenceNo(conn);
    const [ins] = await conn.query(
      `INSERT INTO grievances
        (reference_no, citizen_name, citizen_mobile, citizen_email, district_id, taluk,
         grievance_type_id, description, status, stage, created_by_staff_id, filed_by,
         fee_applicable, fee_amount, fee_collected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 10.00, 0)`,
      [
        reference_no, name, mobile, email, district_id, talukName,
        grievance_type_id, desc, initialStatus, initialStage,
        isStaff ? req.user.id : null,
        isStaff ? 'STAFF' : 'PUBLIC',
      ]
    );
    await saveAttachments(conn, ins.insertId, req.files);
    await addEvent(conn, {
      grievanceId: ins.insertId,
      actorType: isStaff ? 'STAFF' : 'PUBLIC',
      actorId: isStaff ? req.user.id : req.citizen?.id,
      action: 'CREATED',
      toStage: initialStage,
      remarks: autoToPro ? 'Registered by public and sent to PRO' : 'Grievance registered',
    });
    const g = {
      id: ins.insertId,
      reference_no,
      citizen_mobile: mobile,
      citizen_email: email,
      stage: initialStage,
    };
    const [pros] = autoToPro || isPro
      ? await conn.query("SELECT id FROM staff_users WHERE role_code = 'pro' AND is_active = 1 LIMIT 1")
      : [[]];
    await notify({
      conn,
      grievance: g,
      staffUserId: pros[0]?.id,
      title: 'Grievance registered',
      message: `Your concern has been registered. Reference ID: ${reference_no}. Status: ${initialStage === 'DRAFT_SAVED' ? 'Created' : 'Pending'}.`,
    });
    await conn.commit();
    const saved = await loadGrievance(ins.insertId);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.list = async (req, res, next) => {
  try {
    const { status, stage, q, division_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (req.user.role_code === 'divisional_manager') {
      where += ' AND (g.assigned_dm_id = ? OR g.division_id = ? OR g.created_by_staff_id = ?)';
      params.push(req.user.id, req.user.division_id, req.user.id);
    }
    if (status) {
      where += ' AND g.status = ?';
      params.push(status);
    }
    if (stage) {
      where += ' AND g.stage = ?';
      params.push(stage);
    }
    if (division_id) {
      where += ' AND g.division_id = ?';
      params.push(division_id);
    }
    if (q) {
      where += ` AND (g.reference_no LIKE ? OR g.citizen_name LIKE ? OR g.citizen_mobile LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.query(
      `SELECT g.*,
              dt.name AS district_name,
              gt.name AS grievance_type_name,
              dv.name AS division_name,
              dm.name AS assigned_dm_name,
              cr.name AS created_by_name
       FROM grievances g
       JOIN districts dt ON dt.id = g.district_id
       JOIN grievance_types gt ON gt.id = g.grievance_type_id
       LEFT JOIN divisions dv ON dv.id = g.division_id
       LEFT JOIN staff_users dm ON dm.id = g.assigned_dm_id
       LEFT JOIN staff_users cr ON cr.id = g.created_by_staff_id
       ${where}
       ORDER BY g.created_at DESC
       LIMIT 500`,
      params
    );
    res.json({ success: true, data: rows.map(mapRow) });
  } catch (err) {
    next(err);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const groupBy = String(req.query.group_by || 'status').toLowerCase();
    const params = [];
    let where = 'WHERE 1=1';
    if (req.user.role_code === 'divisional_manager') {
      where += ' AND (g.assigned_dm_id = ? OR g.division_id = ? OR g.created_by_staff_id = ?)';
      params.push(req.user.id, req.user.division_id, req.user.id);
    }
    if (req.query.district_id) {
      where += ' AND g.district_id = ?';
      params.push(req.query.district_id);
    }
    if (req.query.grievance_type_id) {
      where += ' AND g.grievance_type_id = ?';
      params.push(req.query.grievance_type_id);
    }
    if (req.query.status) {
      where += ' AND g.status = ?';
      params.push(req.query.status);
    }

    const [counts] = await pool.query(
      `SELECT
         SUM(g.status = 'CREATED') AS created,
         SUM(g.status = 'PENDING') AS pending,
         SUM(g.status = 'COMPLETED') AS completed,
         SUM(g.stage = 'WITH_DIVISION' AND g.due_date IS NOT NULL AND g.due_date < CURDATE()) AS overdue,
         COUNT(*) AS total
       FROM grievances g ${where}`,
      params
    );

    let slices = [];
    if (groupBy === 'district') {
      const [rows] = await pool.query(
        `SELECT dt.name AS name, COUNT(*) AS value
         FROM grievances g
         JOIN districts dt ON dt.id = g.district_id
         ${where}
         GROUP BY dt.id, dt.name
         ORDER BY value DESC, dt.name`,
        params
      );
      slices = rows.map((r) => ({ name: r.name, value: Number(r.value) }));
    } else if (groupBy === 'grievance_type') {
      const [rows] = await pool.query(
        `SELECT gt.name AS name, COUNT(*) AS value
         FROM grievances g
         JOIN grievance_types gt ON gt.id = g.grievance_type_id
         ${where}
         GROUP BY gt.id, gt.name
         ORDER BY value DESC, gt.name`,
        params
      );
      slices = rows.map((r) => ({ name: r.name, value: Number(r.value) }));
    } else if (groupBy === 'division') {
      const [rows] = await pool.query(
        `SELECT COALESCE(dv.name, 'Unassigned') AS name, COUNT(*) AS value
         FROM grievances g
         LEFT JOIN divisions dv ON dv.id = g.division_id
         ${where}
         GROUP BY dv.id, dv.name
         ORDER BY value DESC, name`,
        params
      );
      slices = rows.map((r) => ({ name: r.name, value: Number(r.value) }));
    } else {
      slices = [
        { name: 'Created', value: Number(counts[0].created || 0) },
        { name: 'Pending', value: Number(counts[0].pending || 0) },
        { name: 'Completed', value: Number(counts[0].completed || 0) },
      ];
    }

    res.json({
      success: true,
      data: {
        group_by: ['district', 'grievance_type', 'division'].includes(groupBy) ? groupBy : 'status',
        created: Number(counts[0].created || 0),
        pending: Number(counts[0].pending || 0),
        completed: Number(counts[0].completed || 0),
        overdue: Number(counts[0].overdue || 0),
        total: Number(counts[0].total || 0),
        slices,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user) assertAccess(req.user, g);
    const [events] = await pool.query(
      `SELECT e.*, s.name AS actor_name
       FROM grievance_events e
       LEFT JOIN staff_users s ON s.id = e.actor_id AND e.actor_type = 'STAFF'
       WHERE e.grievance_id = ?
       ORDER BY e.id ASC`,
      [g.id]
    );
    res.json({ success: true, data: { ...g, events } });
  } catch (err) {
    next(err);
  }
};

function normalizeReferenceNo(req) {
  const raw = req.query.referenceNo || req.query.ref || req.params.referenceNo || req.params[0] || '';
  let ref = String(raw).trim();
  try {
    ref = decodeURIComponent(ref);
  } catch {
    /* already decoded */
  }
  return ref.trim();
}

exports.getByReference = async (req, res, next) => {
  try {
    const ref = normalizeReferenceNo(req);
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }
    const [rows] = await pool.query(
      `SELECT g.id, g.reference_no, g.citizen_name, g.citizen_mobile, g.taluk,
              g.description, g.status, g.stage, g.action_taken, g.due_date,
              g.created_at, g.updated_at, g.completed_at,
              dt.name AS district_name, gt.name AS grievance_type_name,
              dv.name AS division_name
       FROM grievances g
       JOIN districts dt ON dt.id = g.district_id
       JOIN grievance_types gt ON gt.id = g.grievance_type_id
       LEFT JOIN divisions dv ON dv.id = g.division_id
       WHERE g.reference_no = ?`,
      [ref]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Reference ID not found' });
    }
    const g = mapRow(rows[0]);
    g.attachments = await loadAttachments(g.id);
    if (req.citizen && req.citizen.mobile !== g.citizen_mobile) {
      // still allow public track by exact reference (document requirement)
    }
    const [events] = await pool.query(
      `SELECT action, from_stage, to_stage, remarks, created_at
       FROM grievance_events WHERE grievance_id = ? ORDER BY id ASC`,
      [g.id]
    );
    res.json({
      success: true,
      data: {
        ...g,
        citizen_mobile: g.citizen_mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
        events: events.map((e) => ({
          ...e,
          public_status: publicStatusFromStage(e.to_stage || g.stage),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.myPublic = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, dt.name AS district_name, gt.name AS grievance_type_name, dv.name AS division_name
       FROM grievances g
       JOIN districts dt ON dt.id = g.district_id
       JOIN grievance_types gt ON gt.id = g.grievance_type_id
       LEFT JOIN divisions dv ON dv.id = g.division_id
       WHERE g.citizen_mobile = ?
       ORDER BY g.created_at DESC`,
      [req.citizen.mobile]
    );
    res.json({ success: true, data: rows.map(mapRow) });
  } catch (err) {
    next(err);
  }
};

exports.forwardToPro = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role_code === 'pro') {
      return res.status(400).json({ success: false, message: 'PRO already receives forwarded grievances' });
    }
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['DRAFT_SAVED'].includes(g.stage)) {
      return res.status(400).json({ success: false, message: 'Only newly created grievances can be forwarded to PRO' });
    }
    const [pros] = await pool.query("SELECT id, email FROM staff_users WHERE role_code = 'pro' AND is_active = 1 LIMIT 1");
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievances SET status = 'PENDING', stage = 'WITH_PRO' WHERE id = ?`,
      [g.id]
    );
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'FORWARDED_TO_PRO',
      fromStage: g.stage,
      toStage: 'WITH_PRO',
      remarks: req.body.remarks || 'Forwarded to Public Relation Officer',
    });
    g.stage = 'WITH_PRO';
    await notify({
      conn,
      grievance: g,
      staffUserId: pros[0]?.id,
      title: 'Grievance forwarded to PRO',
      message: `Reference ${g.reference_no} is now with the Public Relation Officer. Status: Pending.`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.assignToDivision = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role_code !== 'pro') {
      return res.status(403).json({ success: false, message: 'Only PRO can forward to a Divisional Manager' });
    }
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['WITH_PRO', 'WITH_PRO_REVIEW'].includes(g.stage) && g.stage !== 'DRAFT_SAVED') {
      return res.status(400).json({ success: false, message: 'Grievance is not with PRO for assignment' });
    }
    const divisionId = Number(req.body.division_id);
    if (!divisionId) {
      return res.status(400).json({ success: false, message: 'Select a Divisional Manager / division' });
    }
    const [dms] = await pool.query(
      `SELECT id, name, email FROM staff_users
       WHERE role_code = 'divisional_manager' AND division_id = ? AND is_active = 1 LIMIT 1`,
      [divisionId]
    );
    if (!dms.length) {
      return res.status(400).json({ success: false, message: 'No Divisional Manager found for this division' });
    }
    const remarks = (req.body.remarks || '').trim();
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievances
       SET status = 'PENDING', stage = 'WITH_DIVISION', division_id = ?, assigned_dm_id = ?,
           due_date = DATE_ADD(CURDATE(), INTERVAL 10 DAY)
       WHERE id = ?`,
      [divisionId, dms[0].id, g.id]
    );
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'ASSIGNED_TO_DIVISION',
      fromStage: g.stage,
      toStage: 'WITH_DIVISION',
      remarks: remarks || `Forwarded to ${dms[0].name} (10-day SLA)`,
    });
    g.stage = 'WITH_DIVISION';
    await notify({
      conn,
      grievance: g,
      staffUserId: dms[0].id,
      title: 'Grievance assigned to Divisional Manager',
      message: remarks
        ? `Reference ${g.reference_no} has been forwarded to ${dms[0].name}. PRO remarks: ${remarks} Action is due in 10 days. Status: Pending.`
        : `Reference ${g.reference_no} has been forwarded to ${dms[0].name}. Action is due in 10 days. Status: Pending.`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.submitAction = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role_code !== 'divisional_manager') {
      return res.status(403).json({ success: false, message: 'Only Divisional Managers enter Action Taken' });
    }
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    assertAccess(req.user, g);
    if (g.stage !== 'WITH_DIVISION') {
      return res.status(400).json({ success: false, message: 'This grievance is not currently with your division' });
    }
    const actionTaken = (req.body.action_taken || '').trim();
    if (!actionTaken) {
      return res.status(400).json({ success: false, message: 'Action Taken is required' });
    }
    const [pros] = await pool.query("SELECT id FROM staff_users WHERE role_code = 'pro' AND is_active = 1 LIMIT 1");
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievances SET action_taken = ?, status = 'PENDING', stage = 'WITH_PRO_REVIEW' WHERE id = ?`,
      [actionTaken, g.id]
    );
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'ACTION_FORWARDED_TO_PRO',
      fromStage: g.stage,
      toStage: 'WITH_PRO_REVIEW',
      remarks: actionTaken,
    });
    g.stage = 'WITH_PRO_REVIEW';
    await notify({
      conn,
      grievance: g,
      staffUserId: pros[0]?.id,
      title: 'Action taken — sent to PRO for review',
      message: `Reference ${g.reference_no}: Divisional Manager has recorded action and forwarded it to PRO. Status: Pending.`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.revertToDivision = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role_code !== 'pro') {
      return res.status(403).json({ success: false, message: 'Only PRO can revert to the Divisional Manager' });
    }
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    if (g.stage !== 'WITH_PRO_REVIEW' || !g.assigned_dm_id) {
      return res.status(400).json({ success: false, message: 'Nothing to revert — grievance is not awaiting PRO review' });
    }
    const remarks = (req.body.remarks || '').trim();
    if (!remarks) {
      return res.status(400).json({ success: false, message: 'Please record why the action is not satisfactory' });
    }
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievances
       SET status = 'PENDING', stage = 'WITH_DIVISION',
           due_date = DATE_ADD(CURDATE(), INTERVAL 10 DAY)
       WHERE id = ?`,
      [g.id]
    );
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'REVERTED_TO_DIVISION',
      fromStage: g.stage,
      toStage: 'WITH_DIVISION',
      remarks,
    });
    g.stage = 'WITH_DIVISION';
    await notify({
      conn,
      grievance: g,
      staffUserId: g.assigned_dm_id,
      title: 'Returned to Divisional Manager',
      message: `Reference ${g.reference_no} was reverted by PRO. ${remarks} Status: Pending.`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.addAttachments = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    assertAccess(req.user, g);
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'Choose at least one file' });
    }
    await conn.beginTransaction();
    await saveAttachments(conn, g.id, files);
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'ATTACHMENTS_ADDED',
      fromStage: g.stage,
      toStage: g.stage,
      remarks: `Uploaded: ${files.map((f) => f.originalname).join(', ')}`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.complete = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role_code !== 'pro') {
      return res.status(403).json({ success: false, message: 'Only PRO can mark a grievance Completed after review' });
    }
    const g = await loadGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    if (g.stage !== 'WITH_PRO_REVIEW') {
      return res.status(400).json({ success: false, message: 'Complete only after Divisional Manager has forwarded Action Taken' });
    }
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievances SET status = 'COMPLETED', stage = 'COMPLETED', completed_at = NOW() WHERE id = ?`,
      [g.id]
    );
    await addEvent(conn, {
      grievanceId: g.id,
      actorType: 'STAFF',
      actorId: req.user.id,
      action: 'COMPLETED',
      fromStage: g.stage,
      toStage: 'COMPLETED',
      remarks: req.body.remarks || 'PRO accepted the action taken',
    });
    g.stage = 'COMPLETED';
    await notify({
      conn,
      grievance: g,
      title: 'Grievance completed',
      message: `Reference ${g.reference_no} is Completed. Action taken: ${g.action_taken || ''}`,
    });
    await conn.commit();
    res.json({ success: true, data: await loadGrievance(g.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.stageToDbStatus = stageToDbStatus;

const pool = require('../config/db');
const { sendEmail, smsStub } = require('../utils/mailer');

const PUBLIC_STATUS = {
  DRAFT_SAVED: 'Created',
  WITH_PRO: 'Pending',
  WITH_DIVISION: 'Pending',
  WITH_PRO_REVIEW: 'Pending',
  COMPLETED: 'Completed',
};

function publicStatusFromStage(stage) {
  return PUBLIC_STATUS[stage] || 'Pending';
}

function stageToDbStatus(stage) {
  if (stage === 'DRAFT_SAVED') return 'CREATED';
  if (stage === 'COMPLETED') return 'COMPLETED';
  return 'PENDING';
}

async function addEvent(conn, { grievanceId, actorType, actorId, action, fromStage, toStage, remarks }) {
  await conn.query(
    `INSERT INTO grievance_events
      (grievance_id, actor_type, actor_id, action, from_stage, to_stage, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [grievanceId, actorType, actorId || null, action, fromStage || null, toStage || null, remarks || null]
  );
}

async function notify({ conn, grievance, staffUserId, title, message }) {
  const db = conn || pool;
  await db.query(
    `INSERT INTO notifications
      (audience, staff_user_id, citizen_mobile, grievance_id, title, message, channel)
     VALUES ('PUBLIC', NULL, ?, ?, ?, ?, 'INAPP')`,
    [grievance.citizen_mobile, grievance.id, title, message]
  );

  if (staffUserId) {
    await db.query(
      `INSERT INTO notifications
        (audience, staff_user_id, citizen_mobile, grievance_id, title, message, channel)
       VALUES ('STAFF', ?, NULL, ?, ?, ?, 'INAPP')`,
      [staffUserId, grievance.id, title, message]
    );
  }

  const text = `${title}\nReference: ${grievance.reference_no}\nStatus: ${publicStatusFromStage(grievance.stage)}\n${message}`;
  smsStub(grievance.citizen_mobile, text);
  if (grievance.citizen_email) {
    await sendEmail({
      to: grievance.citizen_email,
      subject: `${title} — ${grievance.reference_no}`,
      text,
    });
  }
}

module.exports = {
  publicStatusFromStage,
  stageToDbStatus,
  addEvent,
  notify,
};

import React from 'react';
import {
  Box, IconButton, List, ListItem, ListItemIcon, ListItemText, Paper, Tooltip, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';

function fileIcon(file) {
  const name = (file.original_name || '').toLowerCase();
  const mime = (file.mime_type || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return <PictureAsPdfIcon sx={{ color: '#c62828' }} />;
  }
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/.test(name)) {
    return <ImageIcon sx={{ color: '#1565c0' }} />;
  }
  if (name.endsWith('.doc') || name.endsWith('.docx')) {
    return <DescriptionIcon sx={{ color: '#1565c0' }} />;
  }
  return <InsertDriveFileIcon sx={{ color: '#546e7a' }} />;
}

function formatSize(bytes) {
  const n = Number(bytes);
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ attachments = [] }) {
  if (!attachments.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No documents uploaded yet.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <List disablePadding>
        {attachments.map((file, index) => {
          const size = formatSize(file.file_size);
          return (
            <ListItem
              key={file.id}
              divider={index < attachments.length - 1}
              secondaryAction={
                <Tooltip title="Open / download">
                  <IconButton
                    edge="end"
                    href={file.file_path}
                    target="_blank"
                    rel="noreferrer"
                    color="primary"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{ bgcolor: index % 2 ? '#f7faf8' : '#fff', pr: 8 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{fileIcon(file)}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    component="a"
                    href={file.file_path}
                    target="_blank"
                    rel="noreferrer"
                    fontWeight={700}
                    sx={{ color: 'primary.dark', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {file.original_name}
                  </Typography>
                }
                secondary={
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {size || 'Document'}
                    {file.created_at ? ` · ${new Date(file.created_at).toLocaleString('en-IN')}` : ''}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

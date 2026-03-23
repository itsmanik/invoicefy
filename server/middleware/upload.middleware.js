const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDirectory = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
      if (error) {
        cb(error, uploadDirectory);
        return;
      }

      cb(null, uploadDirectory);
    });
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const imageOnlyFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for logo upload'));
  }
};

const upload = multer({ storage, fileFilter: imageOnlyFilter });

module.exports = upload;

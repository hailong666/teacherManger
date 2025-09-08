const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型创建不同的子目录
    let subDir = 'others';
    
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype.startsWith('audio/')) {
      subDir = 'audio';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'documents/pdf';
    } else if (['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.mimetype)) {
      subDir = 'documents/word';
    } else if (['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'].includes(file.mimetype)) {
      subDir = 'documents/ppt';
    }
    
    const destPath = path.join(uploadDir, subDir);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    // 图片
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 音频
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 默认10MB
  }
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        code: 400,
        message: '文件大小超过限制'
      });
    }
    return res.status(400).json({
      code: 400,
      message: `上传错误: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      code: 400,
      message: err.message
    });
  }
  next();
};

// 创建特定用途的上传中间件实例
const uploadHomework = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 默认10MB
  }
});

const uploadAvatar = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_AVATAR_SIZE) || 2 * 1024 * 1024 // 默认2MB
  }
});

const uploadRecitation = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传音频文件'), false);
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_AUDIO_SIZE) || 5 * 1024 * 1024 // 默认5MB
  }
});

module.exports = {
  upload,
  uploadHomework,
  uploadAvatar,
  uploadRecitation,
  handleUploadError
};
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const port = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保上传目录存在并有正确的权限
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

try {
	fs.ensureDirSync(UPLOAD_DIR);
} catch (error) {
	console.error('Error creating upload directory:', error);
}

/**
 * @name storage 定义文件的存储方式
 * @description Multer 是一个 Node.js 中间件，专门用于处理 multipart/form-data 类型的表单数据，主要用于文件上传
 */ 
const storage = multer.diskStorage({
   // 配置存储位置：从请求头中获取hash，并作为文件存储的临时目录
	destination: function (req, file, cb) {
		const hash = req.headers['x-file-hash'];
		if (!hash) {
			return cb(new Error('No file hash provided'));
		}
		const chunkDir = path.join(UPLOAD_DIR, hash);
		try {
			fs.ensureDirSync(chunkDir);
			cb(null, chunkDir);
		} catch (error) {
			cb(error);
		}
	},
  // 配置文件名：从请求头中获取chunkHash，并作为分片文件名
	filename: function (req, file, cb) {
		const chunkHash = req.headers['x-chunk-hash'];
		if (!chunkHash) {
			return cb(new Error('No chunk hash provided'));
		}
		cb(null, chunkHash);
	},
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 限制切片大小为5MB
	},
});

// 验证文件是否已上传
app.post('/api/verify', async (req, res) => {
	const { hash, filename } = req.body;

	if (!hash || !filename) {
		return res.status(400).json({
			success: false,
			message: 'Missing hash or filename',
		});
	}

	const filePath = path.join(UPLOAD_DIR, hash, filename);
	const chunkDir = path.join(UPLOAD_DIR, hash);
	console.log('Checking file path:', filePath);
	console.log('Checking chunk directory:', chunkDir);

	try {
		// 检查文件是否已存在
		if (fs.existsSync(filePath)) {
			console.log('File already exists');
			return res.json({
				uploaded: true,
				uploadedList: [],
			});
		}

		// 检查已上传的切片
		let uploadedList = [];
		if (fs.existsSync(chunkDir)) {
			uploadedList = await fs.readdir(chunkDir);
			console.log('Found uploaded chunks:', uploadedList);
		}

		res.json({
			uploaded: false,
			uploadedList,
		});
	} catch (error) {
		console.error('Error in verify:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});

// 上传文件切片
app.post('/api/upload', upload.single('chunk'), (req, res) => {
	if (!req.file) {
		console.error('No file in request');
		return res.status(400).json({
			success: false,
			message: 'No file uploaded',
		});
	}
	res.json({
		success: true,
		message: 'Chunk uploaded successfully',
		path: req.file.path,
	});
});

// 合并文件切片
app.post('/api/merge', async (req, res) => {
	const { hash, filename, size } = req.body;

	if (!hash || !filename) {
		return res.status(400).json({
			success: false,
			message: 'Missing hash or filename',
		});
	}

	const chunkDir = path.join(UPLOAD_DIR, hash);
	const filePath = path.join(UPLOAD_DIR, hash, filename);

	// 检查切片目录是否存在
	if (!fs.existsSync(chunkDir)) {
		console.error('Chunk directory not found:', chunkDir);
		return res.status(400).json({
			success: false,
			message: 'Chunk directory not found',
		});
	}

	try {
		// 读取所有切片
		const chunkFiles = await fs.readdir(chunkDir);
		console.log('Found chunks:', chunkFiles);

		// 按索引排序
		chunkFiles.sort((a, b) => {
			const indexA = parseInt(a.split('-')[1]);
			const indexB = parseInt(b.split('-')[1]);
			return indexA - indexB;
		});

		// 创建写入流
		const writeStream = fs.createWriteStream(filePath);
		console.log('Created write stream for:', filePath);

		// 依次写入切片
		for (const chunkFile of chunkFiles) {
			const chunkPath = path.join(chunkDir, chunkFile);
			console.log('Writing chunk:', chunkPath);
			const chunkBuffer = await fs.readFile(chunkPath);
			writeStream.write(chunkBuffer);
			// 删除切片文件
			await fs.remove(chunkPath);
		}

		writeStream.end();
		console.log('Write stream ended');

		// 等待写入完成
		await new Promise((resolve, reject) => {
			writeStream.on('finish', () => {
				console.log('Write stream finished');
				resolve();
			});
			writeStream.on('error', (error) => {
				console.error('Write stream error:', error);
				reject(error);
			});
		});

		// 删除切片目录
		await fs.remove(chunkDir);
		console.log('Removed chunk directory:', chunkDir);

		res.json({
			success: true,
			message: 'File merged successfully',
			path: filePath,
		});
	} catch (error) {
		console.error('Merge error:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to merge file chunks: ' + error.message,
		});
	}
});

// 错误处理中间件
app.use((err, req, res, next) => {
	console.error('Error occurred:', err);
	res.status(500).json({
		success: false,
		message: err.message,
	});
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
	console.log('Upload directory:', UPLOAD_DIR);
});

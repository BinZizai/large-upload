# 大文件上传示例项目

这是一个基于Vue2实现的大文件上传示例项目，展示了如何实现文件分片上传、断点续传、秒传等功能。

## 启动

- 前端：进入web/index.html --> 鼠标右键`Open with Live Server` (前提vscode安装了Live Server插件)
- 服务端：cd server  --> `npm install && npm run dev`


## 功能特点

- 文件分片上传：将大文件分割成小块进行上传
- 断点续传：支持暂停和继续上传
- 秒传功能：通过文件hash判断文件是否已存在
- 上传进度显示：实时显示上传进度
- 文件hash计算：使用SparkMD5计算文件hash值

## 技术栈

- 前端：Vue2 + Axios
- 文件处理：File API、Blob API
- Hash计算：SparkMD5
- 样式：原生CSS

## 核心实现原理

### 1. 文件分片

```javascript
// 将文件分割成2MB大小的块
const CHUNK_SIZE = 2 * 1024 * 1024;

function createFileChunks(file) {
  const chunks = [];
  let cur = 0;
  while (cur < file.size) {
    chunks.push({
      index: chunks.length,
      file: file.slice(cur, cur + CHUNK_SIZE)
    });
    cur += CHUNK_SIZE;
  }
  return chunks;
}
```

### 2. 文件Hash计算

使用SparkMD5计算文件的唯一标识，用于实现秒传功能：

```javascript
async function calculateHash(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e) => {
      const buffer = e.target.result;
      const spark = new SparkMD5.ArrayBuffer();
      spark.append(buffer);
      const hash = spark.end();
      resolve(hash);
    };
  });
}
```

### 3. 断点续传实现

- 使用AbortController控制上传请求的取消
- 记录已上传的切片，支持断点续传
- 上传状态管理：ready、uploading、paused、success、error

### 4. 上传进度计算

```javascript
// 计算总体上传进度
const totalChunks = chunks.length;
let completedChunks = 0;

// 每个切片上传完成后更新进度
completedChunks++;
this.uploadProgress = Math.round((completedChunks * 100) / totalChunks);
```

## 使用方法

1. 启动后端服务（需要自行实现或使用示例后端）
2. 打开index.html文件
3. 选择要上传的文件
4. 点击上传按钮开始上传
5. 可以随时暂停/继续上传

## 学习要点

### 1. 文件处理
- File API的使用
- Blob对象的切片操作
- FileReader读取文件内容

### 2. 网络请求
- Axios的使用
- FormData处理文件上传
- 请求取消和断点续传

### 3. 状态管理
- Vue2的数据响应式
- 上传状态的管理
- 进度计算和显示

### 4. 性能优化
- 大文件分片上传
- 文件hash计算
- 断点续传实现

## 注意事项

1. 后端接口：
   - `/api/upload`：上传文件切片
   - `/api/verify`：验证文件是否已存在
   - `/api/merge`：合并文件切片

2. 文件hash计算可能比较耗时，建议：
   - 使用Web Worker进行计算
   - 显示hash计算进度
   - 考虑使用抽样hash算法

3. 上传进度计算：
   - 考虑网络波动情况
   - 处理上传失败的情况
   - 支持断点续传

## 扩展建议

1. 支持多文件同时上传
2. 添加上传重试机制

## 相关资源

- [Vue2官方文档](https://v2.vuejs.org/)
- [Axios文档](https://axios-http.com/)
- [File API文档](https://developer.mozilla.org/zh-CN/docs/Web/API/File)
- [SparkMD5文档](https://github.com/satazor/js-spark-md5) 
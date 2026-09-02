import express from 'express';

console.log('创建 Express 应用...');
const app = express();
console.log('✅ Express 创建成功');

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

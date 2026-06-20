import { redirect } from 'next/navigation';

// 根路由直接重定向到原生单文件版本 (public/index.html)。
// 整个 WebOS 不再依赖 React 渲染 —— 全部由原生 HTML/CSS/JS 实现。
export default function Home() {
  redirect('/index.html');
}

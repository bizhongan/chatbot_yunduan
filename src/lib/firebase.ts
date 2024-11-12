import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjVcVOSYGsj5mrZ4fSBatrexhyJ_Wz7zA",
  authDomain: "chatyunduan.firebaseapp.com",
  projectId: "chatyunduan",
  storageBucket: "chatyunduan.firebasestorage.app",
  messagingSenderId: "621954328643",
  appId: "1:621954328643:web:5d881814f75bfa6f228cf6",
  measurementId: "G-6DQPW6H508"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 获取 Auth 实例
export const auth = getAuth(app);

// 获取 Firestore 实例
export const db = getFirestore(app);

// 仅在客户端环境下初始化 analytics
if (typeof window !== 'undefined') {
  getAnalytics(app);
}

export default app; 
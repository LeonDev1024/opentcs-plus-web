import { getToken } from '@/utils/auth';
import { ElNotification } from 'element-plus';
import { useNoticeStore } from '@/store/modules/notice';
import { watch } from 'vue';

// 初始化
export const initSSE = (url: any) => {
  if (import.meta.env.VITE_APP_SSE === 'false') {
    return;
  }

  // 检查用户是否登录
  const token = getToken();
  if (!token) {
    console.log('User not logged in, skipping SSE connection');
    return;
  }

  // 构建带有token的URL
  const sseUrl = url + '?Authorization=Bearer ' + token + '&clientid=' + import.meta.env.VITE_APP_CLIENT_ID;
  
  console.log('Connecting to SSE:', sseUrl);
  
  // 使用原生 EventSource
  const eventSource = new EventSource(sseUrl);
  
  eventSource.onopen = () => {
    console.log('SSE connection opened');
  };
  
  eventSource.onmessage = (event) => {
    console.log('SSE message received:', event.data);
    if (!event.data) return;
    useNoticeStore().addNotice({
      message: event.data,
      read: false,
      time: new Date().toLocaleString()
    });
    ElNotification({
      title: '消息',
      message: event.data,
      type: 'success',
      duration: 3000
    });
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    // 尝试重新连接
    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed, attempting to reconnect...');
      setTimeout(() => initSSE(url), 5000);
    }
  };
};

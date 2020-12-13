import Router from 'koa-router';
import auth from './auth/index.js';
import posts from './posts/index.js';

const api = new Router();

api.use('/posts', posts.routes());
api.use('/auth', auth.routes());

export default api;

import mongoose from 'mongoose';
import Joi from 'joi';
import Post from '../../models/post.js';

const { ObjectId } = mongoose.Types;

export const getPostById = async (ctx, next) => {
  const { id } = ctx.params;

  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }

  try {
    const post = await Post.findById(id);

    if (!post) {
      ctx.body = 404;
      return;
    }

    ctx.state.post = post;
    return next();
  } catch (error) {
    console.error('Exception ' + error);
    throw (500, error);
  }

  return next();
};

export const write = async (ctx) => {
  const schema = Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required(),
  });

  const result = schema.validate(ctx.request.body);

  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { title, body, tags } = ctx.request.body;
  const post = new Post({
    title,
    body,
    tags,
    user: ctx.state.user,
  });

  try {
    await post.save();
    ctx.body = post;
  } catch (error) {
    console.error('Exception ' + error);
    ctx.throw(500, error);
  }
};
export const list = async (ctx) => {
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  const { tag, username } = ctx.query;

  const query = {
    ...(username ? { 'user.username': username } : {}),
    ...(tag ? { tags: tag } : {}),
  };

  console.log(query);

  try {
    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(10)
      .skip((page - 1) * 10)
      .lean()
      .exec();
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 10));
    ctx.body = posts.map((post) => ({
      ...post,
      body:
        post.body.length < 200 ? post.body : `${post.body.slice(0, 200)}...`,
    }));
  } catch (error) {
    console.error('Exception ' + error);
    ctx.throw(500, error);
  }
};
export const read = async (ctx) => {
  ctx.body = ctx.state.post;
};
export const remove = async (ctx) => {
  const { id } = ctx.params;
  console.log(id);
  try {
    await Post.findByIdAndRemove(id).exec();
    ctx.status = 204;
  } catch (error) {
    console.error('Exception ' + error);
    ctx.throw(500, error);
  }
};
export const update = async (ctx) => {
  const { id } = ctx.params;

  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  });

  const result = schema.validate(ctx.request.body);

  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;

    return;
  }

  try {
    const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
      new: true,
    }).exec();

    if (!post) {
      ctx.status = 404;
      return;
    }

    ctx.body = post;
  } catch (error) {
    console.error('Exception ' + error);
    ctx.throw(500, error);
  }
};

export const checkOwnPost = (ctx, next) => {
  const { user, post } = ctx.state;

  console.log(user, post);

  if (post.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }

  next();
};
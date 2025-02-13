// const { Op } = require('sequelize');

class PostRepository {
  constructor(UserModel, UserImageModel, PostModel, PostImageModel, FishInfoModel, CommentModel, LikeModel) {
    this.userModel = UserModel;
    this.userImageModel = UserImageModel;
    this.postModel = PostModel;
    this.postImageModel = PostImageModel;
    this.fishInfoModel = FishInfoModel;
    this.commentModel = CommentModel;
    this.likeModel = LikeModel;
  }

  createPost = async (user_id, content) => {
    const createPost = await this.postModel.create({
      user_id,
      content,
    });

    return createPost;
  };

  createPostImages = async (src, post_id) => {
    const images = src.map(
      async (image) =>
        await this.postImageModel.create({
          src: image.location.replace(/\/original\//, '/thumb/'),
          post_id,
        }),
    );
    return images;
  };

  createFishInfo = async (fish_name, post_id) => {
    const createFishInfo = await this.fishInfoModel.create({ fish_name, post_id });

    return createFishInfo;
  };

  findAllPosts = async (user_id) => { //last_id
    const where = {};
    // if (parseInt(last_id, 10)) {
    //   where.post_id = { [Op.lt]: parseInt(last_id, 10) };
    // }
    const posts = await this.postModel.findAll({
      where,
      // limit: 15,
      include: [
        {
          model: this.userModel,
          attributes: ['nickname', 'user_id'],
          include: [
            {
              model: this.userImageModel,
              attributes: ['src'],
            },
          ],
        },
        {
          model: this.postImageModel,
          attributes: ['src'],
        },
        {
          model: this.fishInfoModel,
          attributes: ['fish_name'],
        },
        {
          model: this.commentModel,
          attributes: ['content'],
        },
        {
          model: this.likeModel,
          attributes: ['user_id'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    if (user_id) {
      const like_user = await this.likeModel.findAll({
        where: {
          user_id: user_id,
        },
      });
      return { posts, like_user: like_user };
    } else {
      return { posts, like_user: false };
    }
  };

  findPost = async (post_id) => {
    const post = await this.postModel.findOne({
      where: { post_id },
      include: [
        {
          model: this.userModel,
          attributes: ['nickname'],
          include: [
            {
              model: this.userImageModel,
              attributes: ['src'],
            },
          ],
        },
        {
          model: this.postImageModel,
          attributes: ['src'],
        },
        {
          model: this.fishInfoModel,
          attributes: ['fish_name'],
        },
        {
          model: this.commentModel,
          include: [
            {
              model: this.userModel,
              attributes: ['nickname'],
              include: [
                {
                  model: this.userImageModel,
                  attributes: ['src'],
                },
              ],
            },
          ],
        },
        {
          model: this.likeModel,
          attributes: ['user_id'],
        },
      ],
      order: [[this.commentModel, 'created_at', 'DESC']],
    });

    return post;
  };

  deletePost = async (post_id) => {
    const deletePost = await this.postModel.destroy({ where: { post_id } });

    return deletePost;
  };

  updatePost = async (post_id, content) => {
    const updatePost = await this.postModel.update({ content }, { where: { post_id } });

    return updatePost;
  };

  updateFishInfo = async (post_id, fish_name) => {
    const updateFishInfo = await this.fishInfoModel.update({ fish_name }, { where: { post_id } });

    return updateFishInfo;
  };

  likePost = async (user_id, post_id) => {
    const isLike = await this.likeModel.findAll({ where: { user_id, post_id } });

    if (!isLike.length) {
      await this.likeModel.create({ user_id, post_id });
      return { message: '좋아요' };
    } else {
      await this.likeModel.destroy({ where: { user_id, post_id } });
      return { message: '좋아요 취소' };
    }
  };
}

module.exports = PostRepository;

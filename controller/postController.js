const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const he = require("he");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { isValidObjectId } = require("mongoose");

const { uploadFilesToCloudinary } = require("../helpers/uploadImages");

exports.getPost = asyncHandler(async (req, res, next) => {
  const { postID } = req.params;

  const post = await Post.findById(postID)
    .populate("creator", "username profilePicURL")
    .populate("likedBy", "id")
    .populate("bookmarkedBy", "id")
    .exec();
  const comments = await Comment.find({ post: postID }).populate(
    "author",
    "username profilePicURL"
  );

  const isLiked = post.likedBy.some((user) => user.id === req.user.id);
  const isBookmarked = post.bookmarkedBy.some(
    (user) => user.id === req.user.id
  );

  res.status(201).send({ post, comments, isLiked, isBookmarked });
});

exports.getFeed = asyncHandler(async (req, res, next) => {
  const { following } = await User.findById(req.user.id).exec();

  const allPosts = await Post.find({ creator: { $in: following } }, "-imageURL")
    .populate("creator", "-password")
    .sort({ datePosted: -1 })
    .exec();

  res.status(201).send({ allPosts });
});

exports.getLikedPosts = asyncHandler(async (req, res, next) => {
  const likedPosts = await Post.find({ likedBy: req.user.id }, "-imageURL")
    .populate("creator", "-password")
    .sort({ datePosted: -1 })
    .exec();
  res.status(201).send({ likedPosts });
});

exports.getBookmarkedPosts = asyncHandler(async (req, res, next) => {
  const bookmarkedPosts = await Post.find(
    { bookmarkedBy: req.user.id },
    "-imageURL"
  )
    .populate("creator", "-password")
    .sort({ datePosted: -1 })
    .exec();
  res.status(201).send({ bookmarkedPosts });
});

exports.createPost = [
  // body("text").trim().isLength({ min: 1, max: 500 }).escape(),
  body("title").trim().isLength({ min: 1, max: 50 }).escape(),
  body("description").trim().isLength({ max: 500 }).escape(),
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }

    // const escapedText = he.decode(req.body.text);
    const escapedTitle = req.body.title ? he.decode(req.body.title) : "";
    const escapedDescription = req.body.description
      ? he.decode(req.body.description)
      : "";

    const newPost = new Post({
      // text: escapedText,
      title: escapedTitle,
      description: escapedDescription,
      creator: req.user._id,
      datePosted: new Date(),
    });
    await newPost.save();

    res.status(201).send({ newPost });
  }),
];

/*
This uploads the original file input, as well as compresses it using 
sharp and creates a thumbnail and uploads it.
 */

exports.createPostWithImage = [
  uploadFilesToCloudinary,

  // body("text").trim().isLength({ min: 1, max: 500 }).escape(),
  body("title").trim().isLength({ min: 1, max: 50 }).escape(),
  body("description").trim().isLength({ max: 500 }).escape(),
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).end();
    next();
  }),

  asyncHandler(async (req, res, next) => {
    // const text = req.body.text ? req.body.text[0] : "";
    const escapedText = he.decode(text);
    const escapedTitle = req.body.title ? he.decode(req.body.title) : "";
    const escapedDescription = req.body.description
      ? he.decode(req.body.description)
      : "";

    const newPost = new Post({
      // text: escapedText,
      title: escapedTitle,
      description: escapedDescription,
      creator: req.user._id,
      imageURL: req.imageURL,
      thumbnailImageURL: req.thumbnailURL,
      datePosted: new Date(),
    });

    newPost.save();
    res.status(201).send({ newPost });
  }),
];

exports.editPost = [
  body("text").trim().isLength({ min: 0, max: 500 }).escape(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }

    const { postID } = req.params;
    if (!isValidObjectId(postID)) return res.status(400).end();

    const matchingPost = await Post.findById(postID).exec();
    if (!matchingPost) return res.status(400).end();

    const escapedText = he.decode(req.body.text);
    const editedPost = await Post.findByIdAndUpdate(
      postID,
      { text: escapedText },
      { new: true }
    );
    res.status(201).send({ editedPost });
  }),
];

exports.deletePost = asyncHandler(async (req, res, next) => {
  const { postID } = req.params;
  if (!isValidObjectId(postID)) return res.status(400).end();

  const matchingPost = await Post.findById(postID).exec();
  if (!matchingPost) return res.status(400).end();

  const deletedPost = await Post.findByIdAndUpdate(
    postID,
    { isDeleted: true },
    { new: true }
  );
  res.status(201).send({ deletedPost });
});

exports.likePost = asyncHandler(async (req, res, next) => {
  const { postID } = req.params;
  if (!isValidObjectId(postID)) return res.status(400).end();

  const matchingPost = await Post.findById(postID).exec();
  if (!matchingPost) return res.status(400).end();
  if (matchingPost.likedBy.includes(req.user._id)) {
    return res.status(400).end();
  }

  const likedPost = await Post.findByIdAndUpdate(
    postID,
    { $push: { likedBy: req.user.id } },
    { new: true }
  );

  res.status(201).send({ likedPost });
});

exports.unlikePost = asyncHandler(async (req, res, next) => {
  const { postID } = req.params;
  if (!isValidObjectId(postID)) return res.status(400).end();

  const matchingPost = await Post.findById(postID).exec();
  if (!matchingPost) return res.status(400).end();
  if (!matchingPost.likedBy.includes(req.user._id)) {
    return res.status(400).end();
  }

  const unlikedPost = await Post.findByIdAndUpdate(
    postID,
    { $pull: { likedBy: req.user.id } },
    { new: true }
  );

  res.status(201).send({ unlikedPost });
});

exports.toggleBookmarkPost = asyncHandler(async (req, res, next) => {
  const { postID } = req.params;
  if (!isValidObjectId(postID)) return res.status(400).end();

  const matchingPost = await Post.findById(postID).exec();
  if (!matchingPost) return res.status(400).end();

  if (matchingPost.bookmarkedBy.includes(req.user._id)) {
    matchingPost.bookmarkedBy = matchingPost.bookmarkedBy.filter(
      (userId) => !userId.equals(req.user._id)
    );
  } else {
    matchingPost.bookmarkedBy.push(req.user._id);
  }

  await matchingPost.save();
  res.status(201).send({ matchingPost });
});

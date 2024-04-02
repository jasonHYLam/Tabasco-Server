const {
  initializeMongoServer,
  dropDB,
  closeMongoServer,
} = require("./testConfig/mongo");
const populateTestDB = require("./testConfig/populateTestDB");
const request = require("supertest");
const app = require("./testConfig/testApp");
const users = require("./testData/users");
const posts = require("./testData/posts");

const { postIDs } = require("./testData/ids");
const { userIDs } = require("./testData/ids");

let agent;
const loginData = {
  username: users[0].username,
  password: users[0].password,
};
beforeAll(async () => await initializeMongoServer());
afterAll(async () => await closeMongoServer());
beforeEach(async () => {
  await populateTestDB();
  agent = request.agent(app);
  await agent.post("/auth/login").send(loginData);
});
afterEach(async () => await dropDB());

describe("post tests", () => {
  test("view individual post, which contains comments", async () => {
    const post_0_ID = postIDs[0];
    const getPostResponse = await agent.get(`/post/${post_0_ID}`);
    expect(getPostResponse.status).toBe(201);

    const { post, comments } = getPostResponse.body;

    // console.log("checking post");
    // console.log(post);
    // expect post to have text, a creator
    expect(post).toEqual(
      expect.objectContaining({
        _id: posts[0]._id,
        text: "Test post yup yup",
        creator: userIDs[0],
        datePosted: posts[0].datePosted,
        likedBy: [userIDs[1], userIDs[2], userIDs[3]],
      })
    );
    // expect comments to have text and an author
  });
});

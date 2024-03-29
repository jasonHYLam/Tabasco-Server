// test setup
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

describe("user tests", () => {
  describe("view profile", () => {
    test("view personal profile", async () => {
      const personalProfileResponse = await agent.get(
        "/user/view_personal_profile"
      );
      expect(personalProfileResponse.status).toBe(200);

      // const personalProfileBody = personalProfileResponse.body;
      const { user, posts } = personalProfileResponse.body;
      expect(user).toHaveProperty("id", users[0]._id.toString());
      expect(user).toHaveProperty("username", users[0].username);
      expect(user).toHaveProperty("profilePicURL", users[0].profilePicURL);

      // this is not the way to use arrayContaining, find another way soon
      // expect(posts).arrayContaining(posts[0]);
    });
  });

  describe("changing properties", () => {
    test("change username", async () => {
      const newUsername = { username: "reallyNewUser" };
      const changeUsernameResponse = await agent
        .post("/user/change_username")
        .send(newUsername);
      expect(changeUsernameResponse.status).toBe(200);

      const personalProfileResponse = await agent.get(
        "/user/view_personal_profile"
      );
      const { user } = personalProfileResponse.body;
      expect(user).toHaveProperty("username", "reallyNewUser");
    });
  });
});
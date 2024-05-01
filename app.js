const express = require("express");
const app = express();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "TasksAndUsers.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();

// JwtToken Verification
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (!authHeader) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHeader.split(" ")[1];
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//Register User API-1
app.post("/register", async (request, response) => {
  const { username, password_hash } = request.body;
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}';`;
  console.log(username, password_hash);
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password_hash.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password_hash, 10);
      const createUserQuery = `
            INSERT INTO 
                Users (username, password_hash)
            VALUES(
                
                '${username}',
                '${hashedPassword}'
                
            )`;

      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User Login API-2
app.post("/login", async (request, response) => {
  const { username, password_hash } = request.body;
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}';`;
  console.log(username, password_hash);
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password_hash,
      dbUser.password_hash
    );
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(dbUser, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Create Task - POST /tasks
app.post("/tasks", authenticateToken, async (request, response) => {
  const {
    title,
    description,
    status,
    assignee_id,
    created_at,
    updated_at,
  } = request.body;
  const postTaskQuery = `INSERT INTO Tasks(title,description,status,assignee_id,created_at,updated_at ) VALUES('${title}','${description}','${status}','${assignee_id}','${created_at}','${updated_at}');`;
  await db.run(postTaskQuery);
  response.send("Created a Task");
});

// GET the Tasks

app.get("/tasks", authenticateToken, async (request, response) => {
  const TaskQuery = `
        SELECT 
            * 
        FROM 
            Tasks ;`;

  const TaskArray = await db.all(TaskQuery);
  response.send(TaskArray);
});

app.get("/tasks/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const TaskQuery = `
        SELECT 
            * 
        FROM 
            Tasks
            WHERE id = ${id};`;

  const TaskssArray = await db.get(TaskQuery);
  response.send(TaskssArray);
});

// PUT /tasks/:id - Update a specific task by ID
// PUT /tasks/:id - Update a specific task by ID
app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const updateTaskQuery = `UPDATE Tasks SET status = "In Progress"
    WHERE id = ${id}`;

  try {
    await db.run(updateTaskQuery);
    res.send("Task updated successfully");
  } catch (error) {
    res.status(500).send("Error updating task");
  }
});

// DELETE API

app.delete("/tasks/:id", async (request, response) => {
  const { id } = request.params;
  const deleteTaskQuery = `
  DELETE FROM
    Tasks
  WHERE
    id = ${id};`;

  await db.run(deleteTaskQuery);
  response.send("Deleted");
});

module.exports = app;

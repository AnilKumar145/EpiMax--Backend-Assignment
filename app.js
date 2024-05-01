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
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
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

app.get("/tasks", authenticateToken, async (request, response) => {
  const TaskQuery = `
        SELECT 
            * 
        FROM 
            Task ;`;

  const TaskArray = await db.all(TaskQuery);
  response.send(TaskArray);
});

app.get("/tasks/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const TaskQuery = `
        SELECT 
            * 
        FROM 
            Task 
            WHERE id = ${id};`;

  const TaskssArray = await db.get(TaskQuery);
  response.send(TaskssArray);
});

// PUT /tasks/:id - Update a specific task by ID
app.put("/tasks/:id", (req, res) => {
  const taskId = parseInt(req.params.id);
  const {
    title,
    description,
    assignee_id,
    status,
    created_at,
    updated_at,
  } = req.body;

  // Find the task in the tasksData array by ID
  const taskIndex = tasksData.findIndex((task) => task.id === taskId);

  // If task is not found, return 404 Not Found
  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Update the task with the new data
  tasksData[taskIndex] = {
    id: taskId,
    title: title || tasksData[taskIndex].title,
    description: description || tasksData[taskIndex].description,
    assignee_id: assignee_id || tasksData[taskIndex].assignee_id,
    status: status || tasksData[taskIndex].status,
    created_at: created_at || tasksData[taskIndex].created_at,
    updated_at: updated_at || new Date().toISOString(),
  };

  res.json(tasksData[taskIndex]);
});

// DELETE /tasks/:id - Delete a specific task by ID
app.delete("/tasks/:id", (req, res) => {
  const taskId = parseInt(req.params.id);

  // Find the index of the task in the tasksData array by ID
  const taskIndexx = tasksData.findIndex((task) => task.id === taskId);

  // If task is not found, return 404 Not Found
  if (taskIndexx === -1) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Remove the task from the tasksData array
  const deletedTask = tasksData.splice(taskIndexx, 1);

  res.json({ message: "Task deleted successfully", deletedTask });
});

app.delete("/tasks/:id", async (request, response) => {
  const { id } = request.params;
  const deleteTaskQuery = `
  DELETE FROM
    Task
  WHERE
    id = ${id};`;

  await database.run(deleteTaskQuery);
  response.send(" Deleted");
});

module.exports = app;

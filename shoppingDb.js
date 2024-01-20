const mssql = require('mssql');

/*
var config={
    user: "foo",
    password: "foo",
    server: "localhost",
    database: "WEPPO",
    options: {
        trustServerCertificate: true,
    },
};*/

async function connect(user, password) {
  const conn = new mssql.ConnectionPool(
    `server=localhost,1433;database=WEPPO;trustServerCertificate=true;user id=${user};password=${password}`);
  await conn.connect();
  return conn;
}

async function initiateDB() {
  console.log('Initiating DB...');
  const conn = await connect('foo', 'foo');
  console.log('Connected...');
  const createtableproducts = " IF OBJECT_ID(N'dbo.Products', N'U') IS NULL CREATE TABLE dbo.Products (ID int IDENTITY(1,1) NOT NULL PRIMARY KEY, NAME NVARCHAR(255) NOT NULL, PRICE decimal(8,2) NOT NULL, DESCRIPTION NVARCHAR(255) NOT NULL, CATEGORY NVARCHAR(255) NOT NULL, PICTURE NVARCHAR(255) NOT NULL)";
  const createtableusers = "IF OBJECT_ID(N'dbo.Users', N'U') IS NULL CREATE TABLE dbo.Users (ID int IDENTITY(1,1) NOT NULL PRIMARY KEY, USERNAME NVARCHAR(40) NOT NULL, PASSWORD NVARCHAR(255) NOT NULL, ROLE NVARCHAR(40) NOT NULL)";
  const createtableorder = "IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL CREATE TABLE dbo.Orders (ID int IDENTITY(1,1) NOT NULL PRIMARY KEY, ID_User int NOT NULL FOREIGN KEY (ID_User) REFERENCES Users(ID), NAME NVARCHAR(40) NOT NULL, DATE datetime2(7) NOT NULL)";
  const createtableorderdetails = "IF OBJECT_ID(N'dbo.OrderDetails', N'U') IS NULL CREATE TABLE dbo.OrderDetails (ID int IDENTITY(1,1) NOT NULL PRIMARY KEY, ID_Order int NOT NULL FOREIGN KEY (ID_Order) REFERENCES Orders(ID), ID_Product int NOT NULL FOREIGN KEY (ID_Product) REFERENCES Products(ID), QUANTITY int NOT NULL, PRICE decimal(8,2) NOT NULL)";
  try {
    await runSQL(conn, createtableproducts, 'Create products');
    await runSQL(conn, createtableusers, 'Creating users');
    await runSQL(conn, createtableorder, 'Create orders');
    await runSQL(conn, createtableorderdetails, 'Create orderdetails');
  } catch (error) {
    conn.close();
  } finally {
    conn.close();
  }

}

async function getUser(username) {
  const conn = await connect('foo', 'foo');
  const sql = `SELECT * FROM dbo.USERS WHERE username = '${username}'`;
  const result = await runSQL(conn, sql, 'Getting user');
  console.log(result);
  conn.close();
  return result;
}

async function insertUser(username, hashed) {
  const conn = await connect('foo', 'foo');
  const sql = `INSERT INTO dbo.Users (USERNAME, PASSWORD, ROLE) VALUES ('${username}','${hashed}', 'USER')`;
  const result = await runSQL(conn, sql, 'Inserting user');
  conn.close();
  return result;
}


async function runSQL(conn, sql, comment) {
  return new Promise(function (resolve, reject) {
    conn.query(sql, function (err, result) {
      if (err) {
        console.log('error', err);
        return reject(err);
      }
      resolve(result);
      console.log('success', comment);
    });
  });
}

module.exports = {
  initiateDB,
  getUser,
  insertUser
}
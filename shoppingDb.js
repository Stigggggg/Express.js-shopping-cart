const mssql = require('mssql');
const bcrypt = require("bcrypt");

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

async function connect() {
  const configDB = require('./configdb.json');  
  const conn = new mssql.ConnectionPool(
    `server=localhost,1433;database=WEPPO;trustServerCertificate=true;user id=${configDB[0].user};password=${configDB[0].password}`);
  await conn.connect();
  return conn;
}

async function dropDB() {
  const conn = await connect();
  const dropDB = "DROP DATABASE IF EXISTS WEPPO";
  await runSQL(conn, dropDB, 'Dropping database');
  conn.close();
}

async function initiateDB() {
  console.log('Initiating DB...');
  const conn = await connect();
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

    const countProductsSQL = `SELECT COUNT(*) AS C FROM dbo.Products`;
    const countProducts = await runSQL(conn, countProductsSQL, 'Counting products');
    
    if (countProducts.recordset[0].C > 0) {
      console.log('products already exist');
    }
    else {
      await initiateProducts();
    }

    const adminData = require('./admin.json');
    const adminName = adminData[0].user;
    const admin = await getUser(adminName);
    if (admin.recordset.length > 0) {
      console.log('admin already exists');
    }
    else {
      await insertAdmin();
    }
 
  } catch (error) {
    conn.close();
  } finally {
    conn.close();
  }

}

async function insertAdmin() {
  const admin = require('./admin.json');
  const hashed = await bcrypt.hash(admin[0].password, 10);
  await insertUser(admin[0].user, hashed, 'ADMIN');
}

async function getUser(username) {
  const conn = await connect();
  const sql = `SELECT * FROM dbo.USERS WHERE username = '${username}'`;
  const result = await runSQL(conn, sql, 'Getting user');
  conn.close();
  return result;
}

async function insertUser(username, hashed, role) {
  const conn = await connect();
  const sql = `INSERT INTO dbo.Users (USERNAME, PASSWORD, ROLE) VALUES ('${username}','${hashed}', '${role}')`;
  const result = await runSQL(conn, sql, 'Inserting user');
  conn.close();
  return result;
}

async function initiateProducts() {
  const conn = await connect();
  const products = require('./products.json');
  let values = '';
  products.forEach(product => {
    const value = `('${product.name}', ${product.price}, '${product.description}', '${product.category}', '${product.picture}'), `;
    values += value;
  });
  values = values.substring(0, values.length - 2);
  const sql = `INSERT INTO dbo.Products (NAME, PRICE, DESCRIPTION, CATEGORY, PICTURE) VALUES ${values}`;
  const result = await runSQL(conn, sql, 'Inserting products');
  conn.close();
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
  dropDB,
  initiateDB,
  getUser,
  insertUser
}
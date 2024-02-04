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
  const createtableorder = "IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL CREATE TABLE dbo.Orders (ID int IDENTITY(1,1) NOT NULL PRIMARY KEY, ID_User int NOT NULL FOREIGN KEY (ID_User) REFERENCES Users(ID), NAME NVARCHAR(40) NOT NULL, DATE datetime2(7) NOT NULL, ORDERVALUE decimal(8,2) NOT NULL)";
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

async function insertProduct(product) { //for admin
  const conn = await connect();
  const value = `('${product.name}', ${product.price}, '${product.description}', '${product.category}', '${product.picture}')`;
  const sql = `INSERT INTO dbo.Products (NAME, PRICE, DESCRIPTION, CATEGORY, PICTURE) VALUES ${value}`;
  const result = await runSQL(conn, sql, 'Inserting product');
  conn.close();
}

async function deleteProduct(id) { //for admin
  const conn = await connect();
  const sql = `DELETE FROM dbo.Products WHERE ID = ${id}`;
  const result = await runSQL(conn, sql, 'Deleting product');
  conn.close();
}

async function updateProduct(id, product) { //for admin
  const conn = await connect();
  const sql = `UPDATE dbo.Products SET name = '${product.name}', price = ${product.price}, description = '${product.description}', category = '${product.category}', picture = '${product.picture}' WHERE ID = ${id}`;
  const result = await runSQL(conn, sql, 'Updating product');
  conn.close();
}

async function getAllUsers() { // for user list
  const conn = await connect();
  const sql = `SELECT * FROM dbo.Users`;
  const result = await runSQL(conn, sql, 'Getting all user names');
  console.log(result);
  conn.close();
  return result.recordset;
}

async function deleteUser(id) { // for admin
  const conn = await connect();
  const sql = `DELETE FROM dbo.Users WHERE ROLE = 'USER' AND ID = ${id}`;
  const result = await runSQL(conn, sql, 'Deleting one user');
  console.log(result);
  conn.close();
}

async function getAllProducts() { // for creating website
  const conn = await connect();
  const sql = `SELECT * FROM dbo.Products`;
  const result = await runSQL(conn, sql, 'Getting all products');
  console.log(result);
  conn.close();
  return result;
}

async function getProductById(productId) {
  const conn = await connect();
  const sql = `SELECT * FROM dbo.Products WHERE ID = ${productId}`;
  const result = await runSQL(conn, sql, `Getting product by ID`);
  conn.close();
  return result.recordset[0];
}

async function searchProduct(product) { // for creating website
  const conn = await connect();
  const sql = `SELECT ID, NAME, PRICE, DESCRIPTION, CATEGORY, PICTURE FROM dbo.Products WHERE (NAME LIKE '%${product}%') OR (DESCRIPTION LIKE '%${product}%')`;
  const result = await runSQL(conn, sql, 'Searching the product');
  console.log(result);
  conn.close();
  return result;
}


async function createOrder(order, orderitems) { //potrzbne do koszyka
  const conn = await connect();
  try {
    let orderID;

    let sql = `INSERT INTO dbo.Orders (ID_User, NAME, DATE, ORDERVALUE) OUTPUT Inserted.ID VALUES (${order.id_user}, '${order.name}', '${order.date}', ${order.orderValue})`;
    console.log(sql);
    const result = await runSQL(conn, sql, 'Creting order');
    console.log(result);

    orderID = result.recordset[0].ID;

    let values = '';
    orderitems.forEach(orderitem => {
    const value = `(${orderID}, ${orderitem.idProduct}, ${orderitem.quantity}, ${orderitem.price}), `;
    values += value;
    });
    values = values.substring(0, values.length - 2);


    const sql2 = `INSERT INTO dbo.OrderDetails (ID_Order, ID_Product, QUANTITY, PRICE) VALUES ${values}`;
    const result2 = await runSQL(conn, sql2, 'Inserting orders');

  } catch (error) {
    console.error(error);
  }
}

async function showBasket(ID_Order) {
  const conn = await connect();
  const sql = `SELECT O.ID, U.USERNAME, o.NAME, o.DATE, o.ORDERVALUE FROM dbo.Orders O INNER JOIN dbo.Users U ON O.ID_User = U.ID WHERE O.ID = ${ID_Order}`;
  const sql2 = `SELECT P.NAME, O.QUANTITY, O.PRICE FROM dbo.OrderDetails O INNER JOIN dbo.Products P ON O.ID_Product = P.ID WHERE O.ID_Order = ${ID_Order}`;
  const result = await runSQL(conn, sql, 'Showing the order');
  const result2 = await runSQL(conn, sql2, 'Showing the orderitems');
  const order = { order: result.recordset[0], orderDetails: result2.recordset };
  console.log(order);
  conn.close();
  return order;
}

async function showAllOrders() { // for admin
  const conn = await connect();
  const sql = `SELECT O.ID, U.USERNAME, o.NAME, o.DATE, o.ORDERVALUE FROM dbo.Orders O INNER JOIN dbo.Users U ON O.ID_User = U.ID`;
  const result = await runSQL(conn, sql, 'Showing all orders');
  console.log(result);
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
  insertUser,
  insertProduct,
  deleteProduct,
  updateProduct,
  getAllUsers,
  deleteUser,
  getAllProducts,
  searchProduct,
  createOrder,
  getProductById,
  showBasket,
  showAllOrders
}

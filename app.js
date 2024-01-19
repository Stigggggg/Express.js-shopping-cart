var http=require("http");
var express=require("express");
var mssql=require("mssql");
var bcrypt=require("bcrypt");
var app=express();

app.set("view engine","ejs");
app.set("views","./views");
app.use(express.urlencoded({extended: true}));

var config={
    user: "foo",
    password: "foo",
    server: "localhost",
    database: "WEPPO",
    options: {
        trustServerCertificate: true,
    },
};

app.get("/",(req,res)=>{
    res.render("menu");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.post("/login",async(req,res)=>{
    try
    {
        var {username,password}=req.body;
        await mssql.connect(config);
        var request=new mssql.Request();
        const query=`SELECT * FROM dbo.USERS WHERE username = '${username}'`;
        const result=await request.query(query);
        if(result.recordset.length>0)
        {
            var user=result.recordset[0];
            const password_match=await bcrypt.compare(password,user.password);
            if(password_match)
            {
                res.send("Logowanie pomyślne");
            }
            else 
            {
                res.send("Nieprawidłowe hasło");
            }
        }
        else
        {
            res.send("Nie ma takiego użytkownika");
        }
    }
    catch(error)
    {
        console.error(error);
        res.status(500).send("Błąd podczas logowania");
    }
    finally
    {
        mssql.close();
    }
});

app.get("/signup",(req,res)=>{
    res.render("signup");
});

app.post("/signup",async(req,res)=>{
    try
    {
        var {username,password}=req.body;
        const hashed=await bcrypt.hash(password,10);
        await mssql.connect(config);
        var request=new mssql.Request();
        var query=`INSERT INTO dbo.Users (username,password) VALUES ('${username}','${hashed}')`; 
        await request.query(query);
        res.send("Rejestracja zakończona pomyślnie");
    }
    catch(error)
    {
        console.error(error);
        res.status(500).send("Błąd rejestracji");
    }
    finally
    {
        mssql.close();
    }
});

http.createServer(app).listen(3000);
console.log("started");
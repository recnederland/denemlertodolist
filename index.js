const multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/dosyalar/resimler')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.jpg')
  }
});
var upload = multer({ storage: storage });
const mysql = require("mysql");
const bodyParser = require("body-parser");
const express = require("express");
const app     = express();
app.use(bodyParser.urlencoded( {extended: true} ));
app.set("view engine" , "ejs");
app.use(express.static(__dirname + "/dosyalar"));
app.use(bodyParser.json());
var connection = mysql.createConnection({
  multipleStatements : true,
  host     : 'localhost',
  user     : 'root',
  password : '12344321',
  database : 'bilgiler'
});
connection.connect(function(err){
  if(err) throw err;
  console.log("MYSQL'e bağlandı..");
});
var kategoriler = [] ;
// ya bir kere alsak, bir daha bu fonksyion çağrıldığında, direk daha önceki aldığımızı kullansak ?
function kategorileriAl(callback){
  if(kategoriler.length > 0 ){
    console.log("var olan dönderildi.");
    callback(kategoriler);
  }else{
    connection.query("SELECT * from kategoriler", function(err, results, fields){
      kategoriler = results;
      console.log("veri tabaından alındı.");
      return callback(kategoriler);
    });
  }
}
app.get("/" , function(req , res){
    connection.query("SELECT * from kitaplar WHERE kategori = 'Roman' LIMIT 6  ; SELECT * from kategoriler ;  SELECT * from kitaplar WHERE kategori = 'Bilim' LIMIT 6 ;  SELECT * from kitaplar ORDER BY satis DESC LIMIT 5" , function(err, results, fields){
      if(err) throw err;
      // birinci sonuçta -> kitaplar        > results[0]
      // ikinci sonuçta  -> kategoriler     > results[1]
      var veriTabani6RomanKitabi  = results[0];
      var veriTabaniKategoriler   = results[1];
      var veriTabani6BilimKitabi  = results[2];
      var veriTabaniCokSatanlar   = results[3];
      res.render("anasayfa" , {
                                  bilimler : veriTabani6BilimKitabi,
                                  romanlar :  veriTabani6RomanKitabi,
                                  kategoriler : veriTabaniKategoriler,
                                  coksatanlar : veriTabaniCokSatanlar
                                }
                );
    });
});
// kitapsitesi.com/kitap/TehlikeliOyunlar/78
app.get("/kitap/:isim/:id", function(req, res){
    var idDegeri = req.params.id; // -> 78
    var sql = "SELECT * from kitaplar WHERE id = " + idDegeri ;
    kategorileriAl(function(kategoriler){
      connection.query(sql, function(err, results, fields){
          if(err) throw err;
          console.log(results);
          var kitapId         = results[0].id;
          var kitapYazar      = results[0].yazar;
          var kitapAciklama   = results[0].aciklama;
          var kitapResim      = results[0].resimlinki;
          var kitapYayinEvi   = results[0].yayinevi;
          var kitapIsmi       = results[0].kitapismi;
          var kitapFiyati     = results[0].fiyat;
          var kitapKategori   = results[0].kategori;
          var sql2 = "SELECT * FROM bilgiler.kitaplar WHERE kategori = '"+kitapKategori+"' AND id != "+kitapId+" ORDER BY satis DESC LIMIT 6"
          connection.query(sql2, function(err, results, fields){
            res.render("kitap" , { yazar : kitapYazar,
                                   aciklama: kitapAciklama,
                                   resim : kitapResim,
                                   yayinevi : kitapYayinEvi,
                                   isim : kitapIsmi ,
                                   fiyat : kitapFiyati,
                                   kategori : kitapKategori,
                                   kitaplar : results,
                                   kategoriler : kategoriler
                                 });
          });
      });
    });
});
/// kitapsitesi.com/kategori/roman
/// kitapsitesi.com/kategori/edebiyat
/// veritabanına bakacağız ve şunu sorgulayacağız.
/// kategorisi roman olan tüm kitapları getir.
/// kategorisi edebiyat olan tüm kitapları getir.
/*
SELECT *  FROM bilgiler.kitaplar
LEFT JOIN bilgiler.kategoriler
ON bilgiler.kategoriler.kategori_link = 'bilim'
WHERE bilgiler.kategoriler.kategori_ismi = bilgiler.kitaplar.kategori
*/
app.get("/kategori/:kategorilink", function(req, res){
    kategorileriAl(function(gelenKategoriler){
      // kategoriler geldi...
        var kategoriLink = req.params.kategorilink; // edebiyat
        var sql = "SELECT bilgiler.kitaplar.* FROM bilgiler.kitaplar LEFT JOIN bilgiler.kategoriler ON bilgiler.kategoriler.kategori_link = '"+ kategoriLink +"' WHERE bilgiler.kategoriler.kategori_ismi = bilgiler.kitaplar.kategori"
        connection.query(sql , function(err , results, fields){
            res.render("kategori", {kitaplar : results , kategoriler : gelenKategoriler} );
        });
    });
});
app.get("/arama" , function(req, res){
    // veritabanına bağlanacağız, orada bu kelimeye ait
    // kitap varsa, onları kullanıcıya göstereceğiz.
    var kelime = req.query.kitap;
    // veritabanı bağlantısı oluşturalım. kullanıcın aradığı kelimeyi veritabanına soralım,
    // bulduğumuz sonuçları ekrana yazdıralım.
    var sql = "SELECT * from kitaplar WHERE kitapismi LIKE '%" + kelime + "%'   ;  SELECT * from kategoriler ";
    connection.query(sql,  function(err, results, fields){
      var bulunanKitaplar = results[0];
      var bulunanKategoriler = results[1];
      res.render("arama" , { kitaplar : bulunanKitaplar , kategoriler : bulunanKategoriler });
    });
});
app.get("/kitapekle", function(req, res){
    res.sendFile(__dirname + "/views/kitapekle.html");
});
app.post("/veritabanina-ekle"   ,  upload.single('dosya')  ,  function(req, res){
    var resimlinki = "";
    if(req.file){
      resimlinki = "/resimler/"+req.file.filename;
    }
    var kitapismi = req.body.kitapismi;
    var yazar     = req.body.yazar;
    var fiyat     = req.body.fiyat;
    var kategori  = req.body.kategori;
    var yayinevi  = req.body.yayinevi;
    var aciklama  = req.body.aciklama;
    console.log(req.body);
    console.log(req.body.kitapismi);
    // veritabanına ekleme işlemi yapacağız.
    //kitapismi, fiyat, resimlinki, yayinevi, aciklama, yazar, kategori
    var sql = "INSERT INTO bilgiler.kitaplar (kitapismi, fiyat, resimlinki, yayinevi, aciklama, yazar, kategori) VALUES('"+kitapismi+"','"+ fiyat+"', '"+resimlinki+"' ,'"+ yayinevi + "','" + aciklama +"','"+ yazar +"','"+ kategori+"')";
    connection.query(sql, function(err, results, fields){
      res.redirect("/kitapekle");
    });
});
let port = process.env.PORT;
if(port == "" || port == null){
  port = 5000;
}
app.listen(port, function(){
  console.log("port : " + port);
});

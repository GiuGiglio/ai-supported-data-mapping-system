const XLSX = require('xlsx');

// Sample data
const data = [
  {
    "Product Name": "The Lord of the Rings – Galadriel Miniature Statue",
    "Description": "Beautiful miniature statue of Galadriel from LOTR",
    "Brand": "Funko",
    "Category": "Action Figure",
    "Price": 29.99,
    "Weight": 0.5,
    "Size": "Small",
    "Material": "PVC",
    "Color": "Silver",
    "SKU": "FUN001"
  },
  {
    "Product Name": "Batman Dark Knight Action Figure",
    "Description": "Detailed Batman figure from Dark Knight series",
    "Brand": "McFarlane",
    "Category": "Action Figure",
    "Price": 45.99,
    "Weight": 0.8,
    "Size": "Medium",
    "Material": "PVC",
    "Color": "Black",
    "SKU": "MCF002"
  },
  {
    "Product Name": "Dragon Ball Z Goku Statue",
    "Description": "Premium Goku statue with energy effects",
    "Brand": "Banpresto",
    "Category": "Statue",
    "Price": 89.99,
    "Weight": 2.1,
    "Size": "Large",
    "Material": "Resin",
    "Color": "Orange",
    "SKU": "BNP003"
  },
  {
    "Product Name": "Spider-Man Plush Toy",
    "Description": "Soft and cuddly Spider-Man plush toy",
    "Brand": "Funko",
    "Category": "Plush",
    "Price": 19.99,
    "Weight": 0.3,
    "Size": "XS",
    "Material": "Fabric",
    "Color": "Red/Blue",
    "SKU": "FUN004"
  },
  {
    "Product Name": "Marvel Avengers Iron Man Figure",
    "Description": "Collectible Iron Man figure with LED effects",
    "Brand": "McFarlane",
    "Category": "Action Figure",
    "Price": 65.99,
    "Weight": 1.2,
    "Size": "Medium",
    "Material": "PVC",
    "Color": "Red/Gold",
    "SKU": "MCF005"
  }
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

// Write to file
XLSX.writeFile(workbook, 'src/inputs/sample_data.xlsx');

console.log('Sample Excel file created: src/inputs/sample_data.xlsx'); 
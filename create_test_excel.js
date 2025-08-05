const XLSX = require('xlsx');

// Sample product data that matches the target fields better
const sampleData = [
  {
    'Product Name': 'The Lord of the Rings - Galadriel Miniature Statue',
    'Producer Name': 'Weta Workshop',
    'Product Description': 'Highly detailed miniature statue of Galadriel from The Lord of the Rings trilogy. Hand-painted with exquisite attention to detail.',
    'Initial Suggested Retail Price (SRP) EU': '€249.99',
    'Article Number/SKU': 'WETA-LOTR-GAL-001',
    'GTIN': '9421866161234',
    'Custom Category': 'Collectible Statue',
    'Color': 'Multi-Color',
    'Weight including Outer Carton': '2.8kg',
    'Country of Origin': 'New Zealand',
    'Release Name': 'Lord of the Rings Collection',
    'Language Version': 'English'
  },
  {
    'Product Name': 'Funko Pop! Batman (Dark Knight)',
    'Producer Name': 'Funko',
    'Product Description': 'Collectible vinyl figure of Batman from The Dark Knight movie. Part of the DC Comics Pop! collection.',
    'Initial Suggested Retail Price (SRP) EU': '€12.99',
    'Article Number/SKU': 'FUNKO-DC-BAT-089',
    'GTIN': '0889698123456',
    'Custom Category': 'Pop! Vinyl',
    'Color': 'Black',
    'Weight including Outer Carton': '180g',
    'Country of Origin': 'China',
    'Release Name': 'DC Comics Series',
    'Language Version': 'Multi-Language'
  },
  {
    'Product Name': 'Dragon Ball Z - Super Saiyan Goku Figure',
    'Producer Name': 'Banpresto',
    'Product Description': 'Premium quality figure of Goku in Super Saiyan form from Dragon Ball Z anime series.',
    'Initial Suggested Retail Price (SRP) EU': '€89.99',
    'Article Number/SKU': 'BP-DBZ-SSG-023',
    'GTIN': '4983164123789',
    'Custom Category': 'Anime Figure',
    'Color': 'Orange',
    'Weight including Outer Carton': '950g',
    'Country of Origin': 'Japan',
    'Release Name': 'Dragon Ball Z Collection',
    'Language Version': 'Japanese'
  },
  {
    'Product Name': 'Marvel Spider-Man Premium Statue',
    'Producer Name': 'Sideshow Collectibles',
    'Product Description': 'Museum-quality statue of Spider-Man in iconic web-slinging pose. Limited edition collectible with certificate of authenticity.',
    'Initial Suggested Retail Price (SRP) EU': '€699.99',
    'Article Number/SKU': 'SS-MAR-SPM-456',
    'GTIN': '747720123456',
    'Custom Category': 'Premium Statue',
    'Color': 'Red',
    'Weight including Outer Carton': '8.2kg',
    'Country of Origin': 'China',
    'Release Name': 'Marvel Premium Collection',
    'Language Version': 'English'
  },
  {
    'Product Name': 'Pokémon Pikachu Plush Toy',
    'Producer Name': 'The Pokémon Company',
    'Product Description': 'Soft and cuddly Pikachu plush toy. Perfect for collectors and children alike.',
    'Initial Suggested Retail Price (SRP) EU': '€24.99',
    'Article Number/SKU': 'PKM-PCH-PLU-789',
    'GTIN': '4521329876543',
    'Custom Category': 'Plush Toy',
    'Color': 'Yellow',
    'Weight including Outer Carton': '320g',
    'Country of Origin': 'Vietnam',
    'Release Name': 'Pokémon Classic Series',
    'Language Version': 'Multi-Language'
  }
];

// Create a new workbook
const wb = XLSX.utils.book_new();

// Convert data to worksheet
const ws = XLSX.utils.json_to_sheet(sampleData);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, 'Product Data');

// Write the file
XLSX.writeFile(wb, 'test_products.xlsx');

console.log('✅ Test Excel file created: test_products.xlsx');
console.log('📋 This file contains properly formatted product data that matches your target fields');
console.log('🚀 Upload this file to test the AI field mapping system!');
console.log('');
console.log('Fields included:');
console.log('- Product Name → Portal Name');
console.log('- Producer Name → Producer Name');  
console.log('- Product Description → Product Description');
console.log('- Initial Suggested Retail Price (SRP) EU → Initial Suggested Retail Price (SRP) EU');
console.log('- Article Number/SKU → Article Number/SKU');
console.log('- GTIN → GTIN');
console.log('- Custom Category → Custom Category');
console.log('- Color → Color');
console.log('- Weight including Outer Carton → Weight including Outer Carton');
console.log('- Country of Origin → Country of Origin');
console.log('- Plus additional fields for comprehensive testing');
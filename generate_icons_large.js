import sharp from 'sharp';
import fs from 'fs';

const bgHex = '#18181b'; // graphite
const logoPath = 'logo.webp';
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });

  for (const size of sizes) {
    const iconSize = size;
    // Increase logo size to 95% to make it much larger
    const logoSize = Math.round(size * 0.95);

    // Resize logo
    const logoBuffer = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Create the background and composite the logo
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgHex
      }
    })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);
    
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate apple-touch-icon in public and app dir
  const appleSize = 180;
  const appleLogoSize = Math.round(appleSize * 0.95);
  const appleLogoBuffer = await sharp(logoPath)
    .resize(appleLogoSize, appleLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const appleBuffer = await sharp({
    create: {
      width: appleSize,
      height: appleSize,
      channels: 4,
      background: bgHex
    }
  })
  .composite([{ input: appleLogoBuffer, gravity: 'center' }])
  .png()
  .toBuffer();

  fs.writeFileSync('public/apple-touch-icon.png', appleBuffer);
  fs.writeFileSync('src/app/apple-icon.png', appleBuffer);
  console.log('Generated apple-touch-icon.png');

  // Generate icon for app dir
  const appIconBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bgHex
    }
  })
  .composite([{ 
    input: await sharp(logoPath).resize(486, 486, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} }).toBuffer(), 
    gravity: 'center' 
  }])
  .png()
  .toBuffer();
  fs.writeFileSync('src/app/icon.png', appIconBuffer);
  console.log('Generated app/icon.png');
}

generate().catch(console.error);

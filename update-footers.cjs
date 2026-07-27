const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html') && f !== 'mentions-legales.html' && f !== 'confidentialite.html');

const oldFooterCopyright = `<p>&copy; 2023 Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès. Tous droits réservés. </p>`;
const newFooterCopyright = `<div style="display: flex; justify-content: space-between; flex-wrap: wrap; width: 100%;">
                <p>&copy; 2024 Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès. Tous droits réservés.</p>
                <p>
                    <a href="mentions-legales.html" style="color: #ccc; margin-right: 15px; text-decoration: none;">Mentions Légales</a>
                    <a href="confidentialite.html" style="color: #ccc; text-decoration: none;">Politique de Confidentialité</a>
                </p>
            </div>`;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldFooterCopyright)) {
        content = content.replace(oldFooterCopyright, newFooterCopyright);
        fs.writeFileSync(file, content);
        console.log(`Updated footer in ${file}`);
    } else {
        console.log(`Could not find target string in ${file}`);
    }
});

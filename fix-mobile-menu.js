const fs = require('fs');
const path = require('path');

// List of all HTML files to update
const htmlFiles = [
    'publications.html',
    'authors.html',
    'bestselling.html',
    'newarrival.html',
    'about.html',
    'Review.html',
    'index.html'
];

// The mobile menu toggle functionality to add
const mobileMenuScript = `
    // Mobile menu toggle functionality
    document.addEventListener('DOMContentLoaded', function() {
        const menuToggle = document.getElementById('menu-toggle');
        const mainNav = document.getElementById('main-nav');
        
        // Toggle mobile menu
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                mainNav.classList.toggle('active');
                
                // Close all dropdowns when toggling mobile menu
                if (!mainNav.classList.contains('active')) {
                    document.querySelectorAll('.dropdown').forEach(dropdown => {
                        dropdown.classList.remove('open');
                    });
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                    menuToggle.classList.remove('active');
                    mainNav.classList.remove('active');
                    document.querySelectorAll('.dropdown').forEach(dropdown => {
                        dropdown.classList.remove('open');
                    });
                }
            });
        }

        // Handle dropdown toggle for all dropdowns including contact
        document.querySelectorAll('.dropdown > a').forEach(dropdownToggle => {
            // Remove any existing click event listeners to prevent duplicates
            const newToggle = dropdownToggle.cloneNode(true);
            dropdownToggle.parentNode.replaceChild(newToggle, dropdownToggle);
            
            newToggle.addEventListener('click', function(e) {
                // Prevent default for all dropdown toggles
                e.preventDefault();
                e.stopPropagation();
                
                const dropdown = this.parentElement;
                const isOpen = dropdown.classList.contains('open');
                
                // Close all other dropdowns
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                
                // Toggle current dropdown
                if (!isOpen) {
                    dropdown.classList.add('open');
                } else {
                    dropdown.classList.remove('open');
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        });
    });
`;

// Function to update a single file
function updateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if the file already has the mobile menu script
        if (content.includes('// Mobile menu toggle functionality')) {
            // Remove existing mobile menu script
            content = content.replace(
                /\/\/ Mobile menu toggle functionality[\s\S]*?<\/script>/,
                mobileMenuScript + '\n    </script>'
            );
        } else {
            // Add the mobile menu script before the closing body tag
            const closingBodyIndex = content.lastIndexOf('</body>');
            if (closingBodyIndex !== -1) {
                content = content.substring(0, closingBodyIndex) + 
                          '\n    <script>' + mobileMenuScript + '\n    </script>\n' + 
                          content.substring(closingBodyIndex);
            } else {
                // If no body tag is found, append at the end
                content += '\n    <script>' + mobileMenuScript + '\n    </script>\n';
            }
        }
        
        // Save the updated file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
        return false;
    }
}

// Update all HTML files
console.log('Starting to update mobile menu functionality...');
let successCount = 0;

htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const success = updateFile(filePath);
        if (success) successCount++;
    } else {
        console.warn(`File not found: ${filePath}`);
    }
});

console.log(`\nUpdate complete! Successfully updated ${successCount} out of ${htmlFiles.length} files.`);

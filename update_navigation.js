const fs = require('fs');
const path = require('path');

// List of HTML files to update (excluding index.html and about.html which we've already updated)
const htmlFiles = [
    'authors.html',
    'bestselling.html',
    'newarrival.html',
    'publications.html',
    'Review.html'
];

// The contact dropdown HTML to insert
const contactDropdown = `
                    <li class="dropdown">
                        <a href="#" class="nav-link" onclick="event.preventDefault()">Contact <i class="fas fa-caret-down"></i></a>
                        <ul class="dropdown-menu">
                            <li><a href="index.html#footer" class="smooth-scroll">Contact Us</a></li>
                            <li><a href="Review.html">Reviews</a></li>
                        </ul>
                    </li>`;

// The JavaScript to add/update
const dropdownScript = `
        // Dropdown functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Handle dropdown toggle for all dropdowns including contact
            document.querySelectorAll('.dropdown > a').forEach(dropdownToggle => {
                dropdownToggle.addEventListener('click', function(e) {
                    // On mobile, toggle the dropdown
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        const dropdown = this.parentElement;
                        const isOpen = dropdown.classList.contains('open');
                        
                        // Close all other dropdowns
                        document.querySelectorAll('.dropdown').forEach(d => {
                            if (d !== dropdown) d.classList.remove('open');
                        });
                        
                        // Toggle current dropdown
                        if (!isOpen) {
                            dropdown.classList.add('open');
                        }
                        
                        // Don't proceed to link on mobile
                        return;
                    }
                    
                    // On desktop, prevent default to stop navigation
                    e.preventDefault();
                    
                    // Close all other dropdowns
                    document.querySelectorAll('.dropdown').forEach(d => {
                        if (d !== this.parentElement) d.classList.remove('open');
                    });
                    
                    // Toggle current dropdown
                    this.parentElement.classList.toggle('open');
                });
            });
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.dropdown')) {
                    document.querySelectorAll('.dropdown').forEach(dropdown => {
                        dropdown.classList.remove('open');
                    });
                }
            });
            
            // Handle smooth scrolling for navigation links
            document.querySelectorAll('a.smooth-scroll, .dropdown-menu a').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const targetId = this.getAttribute('href');
                    
                    // Skip if it's just a # or points to an external page
                    if (!targetId || targetId === '#' || targetId.includes('.html')) return;
                    
                    e.preventDefault();
                    try {
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            // Close mobile menu if open
                            const mainNav = document.getElementById('main-nav');
                            const menuToggle = document.getElementById('menu-toggle');
                            
                            if (mainNav && mainNav.classList.contains('active')) {
                                menuToggle.classList.remove('active');
                                mainNav.classList.remove('active');
                            }
                            
                            // Close all dropdowns
                            document.querySelectorAll('.dropdown').forEach(dropdown => {
                                dropdown.classList.remove('open');
                            });
                            
                            // Smooth scroll to target
                            window.scrollTo({
                                top: targetElement.offsetTop - 100,
                                behavior: 'smooth'
                            });
                        }
                    } catch (error) {
                        console.error("Error finding or scrolling to target element:", targetId, error);
                    }
                });
            });
        });`;

// Process each HTML file
htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    // Skip if file doesn't exist
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - file not found`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Replace the contact link with the dropdown
    content = content.replace(
        /<li><a href="[^"]*#footer">Contact<\/a><\/li>/,
        contactDropdown
    );
    
    // 2. Add/update the JavaScript
    // Check if there's already a script with the dropdown functionality
    if (content.includes('// Dropdown functionality')) {
        // Update existing script
        content = content.replace(
            /\/\/ Dropdown functionality[\s\S]*?<\/script>/,
            dropdownScript + '\n    </script>'
        );
    } else {
        // Add new script before the closing body tag
        content = content.replace(
            /<\/body>/, 
            `    <script>${dropdownScript}\n    </script>\n</body>`
        );
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});

console.log('Navigation update complete!');

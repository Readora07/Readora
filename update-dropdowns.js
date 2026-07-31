const fs = require('fs');
const path = require('path');

// The improved dropdown functionality code
const newDropdownCode = `
        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const mainNav = document.getElementById('main-nav');
        
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                menuToggle.classList.toggle('active');
                mainNav.classList.toggle('active');
                
                // Close all dropdowns when toggling mobile menu
                if (!mainNav.classList.contains('active')) {
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
                
                // If on mobile and clicking a dropdown in the mobile menu, don't close the menu
                if (window.innerWidth <= 768) {
                    e.stopPropagation();
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
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
        });`;

// List of HTML files to update
const htmlFiles = [
    'about.html',
    'authors.html',
    'bestselling.html',
    'newarrival.html',
    'publications.html',
    'Review.html'
];

// Function to update a single file
function updateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace the dropdown functionality code
        const updatedContent = content.replace(
            /\/\*\*\* DROPDOWN FUNCTIONALITY START \*\*\*\/[\s\S]*?\/\*\*\* DROPDOWN FUNCTIONALITY END \*\*\*\//,
            '/*** DROPDOWN FUNCTIONALITY START ***/' + newDropdownCode + '\n        /*** DROPDOWN FUNCTIONALITY END ***/'
        );
        
        // If the file doesn't have the markers, add the code before the closing script tag
        if (content === updatedContent) {
            const scriptEnd = content.lastIndexOf('</script>');
            if (scriptEnd !== -1) {
                content = content.substring(0, scriptEnd) + 
                          '\n        /*** DROPDOWN FUNCTIONALITY START ***/' + 
                          newDropdownCode + 
                          '\n        /*** DROPDOWN FUNCTIONALITY END ***/\n    ' + 
                          content.substring(scriptEnd);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated ${filePath} (added markers)`);
            } else {
                console.error(`Could not find script tag in ${filePath}`);
            }
        } else {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
    }
}

// Update all HTML files
htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        updateFile(filePath);
    } else {
        console.warn(`File not found: ${filePath}`);
    }
});

console.log('Dropdown update complete!');

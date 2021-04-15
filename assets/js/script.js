const nbCollapse = document.getElementById("main-navbar");
const nbCollapseHeight = document.getElementById("main-navbar").style;


document.getElementById("navbar-toggler").addEventListener("click", (e) => { 
   if(nbCollapse.classList.contains("show")) {
        nbCollapse.classList.remove("show");

        nbCollapse.classList.add("collapsing");
        nbCollapse.style.height = 0;

        setTimeout(() => {
            nbCollapse.classList.remove("collapsing");
            nbCollapse.classList.add("collapse");

        }, 360);
   } else {
        nbCollapse.classList.remove("collapse");
        nbCollapse.classList.add("collapsing");
        nbCollapse.style.height = nbCollapse.scrollHeight;

        setTimeout(() => {
            nbCollapse.classList.remove("collapsing");
            nbCollapse.classList.add("show");
        }, 360);
   }
});

window.addEventListener('resize', (e) => {
    if(document.getElementsByTagName("body")[0].clientWidth >= 768) {
        if(nbCollapseHeight.height) {
            nbCollapseHeight.removeProperty('height');
        }
    }
});
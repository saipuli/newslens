let url = "https://www.indiatoday.in/rss/1206578";
const textarea = document.querySelector("#feed-area-india-today");

const date = new Date();
document.querySelector("#date").innerHTML = date.toDateString();

feednami.load(url).then((feed) => {
  textarea.value = "";
  // console.log(feed);
  for (let entry of feed.entries.slice(feed.entries, 12)) {
    //create a list element
    let li = document.createElement("div");
    li.className = "bg-white shadow-2xl opacity-80 hover:opacity-100";
    let stripper = document.createElement("div");
    stripper.innerHTML = entry.description;
    let textContent = stripper.textContent || stripper.innerText || "";

    if (entry.title.toUpperCase() === textContent.trim().toUpperCase()) {
      console.log("title and description same...");
      textContent = "";
    } else {
      console.log("they're different");
    }

    var firstImage = stripper.getElementsByTagName("img")[0];
    var imgSrc = firstImage
      ? firstImage.src
      : "https://via.placeholder.com/647x363.png?text=indialens.com";

    const cardHtml = `
    <a href="${entry.origlink || entry.link}">
      <div>
        <img src="${imgSrc}">
      </div>
      <div class="px-4 py-2 mt-2 bg-white">
        <h2 class="font-bold text-md text-gray-900">${entry.title}</h2>
        <div class="user flex justify-between items-center -ml-3 mt-2 mb-4">
          <div class="user-logo">
              <img class="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-4  shadow" src="${
                feed.meta.image.url
              }" alt="avatar">
          </div>
          <div>
              ${new Date(entry.pubdate).toLocaleDateString()}  
          </div>
        </div>
      </div>
    </a>`;

    //add HTML content to list items
    // li.innerHTML = `<h4><a href="${entry.link}">${entry.title}</a></h4><p>${entry.description}</p>`;
    li.innerHTML = cardHtml;
    //append HTML content to list
    textarea.appendChild(li);
  }
});

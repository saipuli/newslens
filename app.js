let url = "https://www.indiatoday.in/rss/1206578";
const textarea = document.querySelector("#feed-textarea");

const date = new Date();
document.querySelector("#date").innerHTML = date.toDateString();

feednami.load(url).then((feed) => {
  textarea.value = "";
  // console.log(feed.entries);
  for (let entry of feed.entries.slice(feed.entries, 12)) {
    //create a list element
    let li = document.createElement("div");
    li.className = "min-w-0 p-4 bg-white rounded-lg shadow-xs dark:bg-gray-800";
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
    var imgSrc = firstImage ? firstImage.src : "";
    if(imgSrc)
    {
      firstImage = document.createElement('img');
      firstImage.src = imgSrc;
      firstImage.className = "h-8 w-8 rounded-full object-cover mx-1";
    }

    const cardHtml = `
               <h4 class="mb-4 font-semibold text-gray-600 dark:text-gray-300">
               <a href="${entry.link}">${entry.title}</a>
               </h4>
               ${firstImage.outerHTML}
               <p class="text-gray-600 dark:text-gray-400">
                ${textContent}
               </p>`;

    //add HTML content to list items
    // li.innerHTML = `<h4><a href="${entry.link}">${entry.title}</a></h4><p>${entry.description}</p>`;
    li.innerHTML = cardHtml;
    //append HTML content to list
    textarea.appendChild(li);
  }
});

//Using feednami to fetch RSS feeds
//https://toolkit.sekando.com/docs/en/feednami

//Feeds from BBC News
//https://www.bbc.com/news/10628494#userss

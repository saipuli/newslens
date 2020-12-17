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
    li.className = "py-6";
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
    <div class="flex max-w-md bg-white shadow-lg rounded-lg overflow-hidden">
      <div class="w-1/3 bg-cover" 
        style="background-image: url('${imgSrc}')">
      </div> 
      <div class="w-2/3 p-4">
        <h3 class="text-gray-900 font-bold"><a href="${entry.link}">${entry.title}</a></h3>
        <p class="mt-2 text-gray-600 text-sm">${textContent}</p>
      </div>
    </div>`;

    //add HTML content to list items
    // li.innerHTML = `<h4><a href="${entry.link}">${entry.title}</a></h4><p>${entry.description}</p>`;
    li.innerHTML = cardHtml;
    //append HTML content to list
    textarea.appendChild(li);
  }
});
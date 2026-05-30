const foodInput = document.getElementById("foodInput");
const addButton = document.getElementById("addButton");
const foodList = document.getElementById("foodList");

let foods = JSON.parse(localStorage.getItem("foods")) || [];

function saveFoods() {
  localStorage.setItem("foods", JSON.stringify(foods));
}

function renderFoods() {
  foodList.innerHTML = "";

  foods.forEach((food, index) => {
    const container = document.createElement("div");
    container.className = "swipe-container";

    const deleteBackground = document.createElement("div");
    deleteBackground.className = "delete-background";
    deleteBackground.innerHTML = `
      <span class="material-symbols-outlined">delete</span>
    `;

    const li = document.createElement("li");
    li.className = "swipe-item";

    let startX = 0;
    let currentX = 0;

    li.addEventListener("touchstart", (event) => {
      startX = event.touches[0].clientX;
      li.style.transition = "none";
    });

    li.addEventListener(
  "touchmove",
  (event) => {
    currentX = event.touches[0].clientX - startX;

    if (currentX > 0) {
      event.preventDefault();
      li.style.transform = `translateX(${currentX}px)`;
    }
  },
  { passive: false }
);

    li.addEventListener("touchend", () => {
      li.style.transition = "transform 0.25s ease-out, opacity 0.25s ease-out";

      if (currentX > 120) {
        li.style.transform = "translateX(120%)";
        li.style.opacity = "0";

        setTimeout(() => {
          foods.splice(index, 1);
          saveFoods();
          renderFoods();
        }, 250);
      } else {
        li.style.transform = "translateX(0)";
      }

      currentX = 0;
    });

    const nameSpan = document.createElement("span");
    nameSpan.textContent = food.name;

    const minusButton = document.createElement("button");
    minusButton.textContent = "−";

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.value = food.quantity;
    quantityInput.min = "0";

    const plusButton = document.createElement("button");
    plusButton.textContent = "+";

    minusButton.addEventListener("click", () => {
      if (food.quantity > 0) {
        food.quantity--;
        saveFoods();
        renderFoods();
      }
    });

    plusButton.addEventListener("click", () => {
      food.quantity++;
      saveFoods();
      renderFoods();
    });

    quantityInput.addEventListener("change", () => {
      food.quantity = Number(quantityInput.value);
      saveFoods();
      renderFoods();
    });

    li.appendChild(nameSpan);
    li.appendChild(minusButton);
    li.appendChild(quantityInput);
    li.appendChild(plusButton);

    container.appendChild(deleteBackground);
    container.appendChild(li);

    foodList.appendChild(container);
  });
}

addButton.addEventListener("click", () => {
  const foodName = foodInput.value.trim();

  if (foodName === "") {
    return;
  }

  foods.push({
    name: foodName,
    quantity: 1,
  });

  saveFoods();
  renderFoods();

  foodInput.value = "";
});

renderFoods();
const foodList = document.getElementById("foodList");

let foods = JSON.parse(localStorage.getItem("foods")) || [];

function saveFoods() {
  localStorage.setItem("foods", JSON.stringify(foods));
}

function normalizeFood(food) {
  if (typeof food === "string") {
    return {
      id: crypto.randomUUID(),
      name: food,
      genre: "その他",
      storage: "冷蔵庫",
      quantity: 1,
      unit: "個",
      expiryDate: "",
      memo: "",
      registeredAt: new Date().toISOString()
    };
  }

  return {
    id: food.id || crypto.randomUUID(),
    name: food.name || "名称未設定",
    genre: food.genre || "その他",
    storage: food.storage || "冷蔵庫",
    quantity: Number(food.quantity ?? 1),
    unit: food.unit || "個",
    expiryDate: food.expiryDate || "",
    memo: food.memo || "",
    registeredAt: food.registeredAt || new Date().toISOString()
  };
}

foods = foods.map(normalizeFood);
saveFoods();

function formatDate(dateText) {
  if (!dateText) {
    return "期限なし";
  }

  return dateText.replaceAll("-", "/");
}

function getThumbnailIcon(genre) {
  const icons = {
    "肉": "restaurant",
    "魚": "set_meal",
    "野菜・くだもの": "nutrition",
    "卵・乳製品": "egg_alt",
    "主食": "rice_bowl",
    "調味料": "local_dining",
    "その他": "kitchen"
  };

  return icons[genre] || "kitchen";
}

function createSwipeEvents(li, container, index) {
  let startX = 0;
  let currentX = 0;

  li.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    currentX = 0;
    li.style.transition = "none";
  });

  li.addEventListener(
    "touchmove",
    (event) => {
      currentX = event.touches[0].clientX - startX;

      if (currentX > 0) {
        event.preventDefault();
        container.classList.add("is-swiping");
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
        container.classList.remove("is-swiping");
        foods.splice(index, 1);
        saveFoods();
        renderFoods();
      }, 250);
    } else {
      li.style.transform = "translateX(0)";

      setTimeout(() => {
        container.classList.remove("is-swiping");
      }, 250);
    }

    currentX = 0;
  });
}

function renderFoods() {
  foodList.innerHTML = "";

  if (foods.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "まずは右上の＋ボタンから食材を登録してみましょう";
    foodList.appendChild(emptyMessage);
    return;
  }

  foods.forEach((food, index) => {
    const container = document.createElement("div");
    container.className = "swipe-container";

    const deleteBackground = document.createElement("div");
    deleteBackground.className = "delete-background";
    deleteBackground.innerHTML = `
      <span class="material-symbols-outlined">delete</span>
    `;

    const li = document.createElement("li");
    li.className = "food-card swipe-item";
    createSwipeEvents(li, container, index);

    const thumbnail = document.createElement("div");
    thumbnail.className = "food-thumbnail";
    thumbnail.innerHTML = `
      <span class="material-symbols-outlined">${getThumbnailIcon(food.genre)}</span>
    `;

    const detail = document.createElement("div");
    detail.className = "food-detail";

    const name = document.createElement("p");
    name.className = "food-name";
    name.textContent = food.name;

    const tags = document.createElement("div");
    tags.className = "food-tags";
    tags.innerHTML = `
      <span class="food-dot"></span>
      <span>${food.genre}</span>
      <span class="material-symbols-outlined">kitchen</span>
      <span>${food.storage}</span>
    `;

    const amount = document.createElement("div");
    amount.className = "food-amount";
    amount.innerHTML = `
      <span>${food.quantity}${food.unit}</span>
      <span class="expiry-badge">期限: ${formatDate(food.expiryDate)}</span>
    `;

    detail.appendChild(name);
    detail.appendChild(tags);
    detail.appendChild(amount);

    const arrow = document.createElement("span");
    arrow.className = "material-symbols-outlined food-arrow";
    arrow.textContent = "chevron_right";

    li.appendChild(thumbnail);
    li.appendChild(detail);
    li.appendChild(arrow);

    container.appendChild(deleteBackground);
    container.appendChild(li);
    foodList.appendChild(container);
  });
}

renderFoods();
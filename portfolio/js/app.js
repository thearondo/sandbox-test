/* Portfolio script: loads data/projects.json and renders the home grid or a project detail page. No frameworks. */
(function () {
  "use strict";

  var DATA_URL = "data/projects.json";
  var THUMB_VARIANTS = 6;

  document.documentElement.classList.remove("no-js");

  /* Fetch the project list. Resolves to an array of project objects. */
  function loadProjects() {
    return fetch(DATA_URL, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load projects (HTTP " + response.status + ")");
      }
      return response.json();
    });
  }

  /* Create an element with an optional class name and text content. */
  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    if (text !== undefined) {
      el.textContent = text;
    }
    return el;
  }

  /* Build a <ul> of tag chips. */
  function renderTags(tags) {
    var list = createEl("ul", "tag-list");
    (tags || []).forEach(function (tag) {
      var item = createEl("li");
      item.appendChild(createEl("span", "tag", tag));
      list.appendChild(item);
    });
    return list;
  }

  /* Link to a project's detail page. */
  function projectUrl(id) {
    return "project.html?id=" + encodeURIComponent(id);
  }

  /* Build one project card. The whole card is a real link. */
  function renderCard(project, index) {
    var item = createEl("li");
    var link = createEl("a", "card");
    link.href = projectUrl(project.id);

    var thumb = createEl("div", "card__thumb thumb--" + ((index % THUMB_VARIANTS) + 1));
    thumb.setAttribute("aria-hidden", "true");

    var body = createEl("div", "card__body");
    body.appendChild(createEl("h3", "card__title", project.title));
    body.appendChild(createEl("p", "card__summary", project.summary));
    body.appendChild(renderTags(project.tags));

    link.appendChild(thumb);
    link.appendChild(body);
    item.appendChild(link);
    return item;
  }

  /* Render all project cards into the home page grid. */
  function renderGrid(projects, grid) {
    var fragment = document.createDocumentFragment();
    projects.forEach(function (project, index) {
      fragment.appendChild(renderCard(project, index));
    });
    grid.replaceChildren(fragment);
  }

  /* Render the "Project not found" state with a link home. */
  function renderNotFound(container) {
    document.title = "Project not found | Your Name Portfolio";
    var heading = createEl("h1", "detail__title", "Project not found");
    var message = createEl("p", null, "We couldn't find that project. It may have been renamed or removed.");
    var home = createEl("p");
    var link = createEl("a", null, "Go to all projects");
    link.href = "index.html";
    home.appendChild(link);
    container.replaceChildren(heading, message, home);
  }

  /* Render a single project's details. */
  function renderDetail(project, container) {
    document.title = project.title + " | Your Name Portfolio";

    var image = createEl("img", "detail__image");
    image.src = "images/placeholder.svg";
    image.alt = "Placeholder illustration for " + project.title;
    image.width = 800;
    image.height = 400;

    var heading = createEl("h1", "detail__title", project.title);
    var description = createEl("p", "detail__description", project.description);

    var meta = createEl("dl", "detail__meta");
    meta.appendChild(createEl("dt", null, "Year"));
    meta.appendChild(createEl("dd", null, String(project.year)));
    meta.appendChild(createEl("dt", null, "Status"));
    var statusCell = createEl("dd");
    statusCell.appendChild(createEl("span", "badge", project.status));
    meta.appendChild(statusCell);
    meta.appendChild(createEl("dt", null, "Tags"));
    var tagsCell = createEl("dd");
    tagsCell.appendChild(renderTags(project.tags));
    meta.appendChild(tagsCell);

    container.replaceChildren(image, heading, description, meta);
  }

  /* Show a load error in place of the content. */
  function renderError(container, message) {
    container.replaceChildren(createEl("p", "status-message", message));
  }

  /* Home page entry point. */
  function initHome() {
    var grid = document.getElementById("project-grid");
    var status = document.getElementById("grid-status");
    loadProjects()
      .then(function (projects) {
        renderGrid(projects, grid);
      })
      .catch(function () {
        status.textContent = "Projects couldn't load right now. Please refresh the page.";
        status.hidden = false;
      });
  }

  /* Detail page entry point. */
  function initDetail() {
    var container = document.getElementById("project-detail");
    var id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      renderNotFound(container);
      return;
    }
    loadProjects()
      .then(function (projects) {
        var project = projects.find(function (p) {
          return p.id === id;
        });
        if (project) {
          renderDetail(project, container);
        } else {
          renderNotFound(container);
        }
      })
      .catch(function () {
        renderError(container, "This project couldn't load right now. Please refresh the page.");
      });
  }

  var page = document.body.getAttribute("data-page");
  if (page === "home") {
    initHome();
  } else if (page === "detail") {
    initDetail();
  }
})();

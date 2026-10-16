/** Single-question quiz. Classic script — works on file:// lessons. */
function mountQuiz(root, { question, options, explain }) {
  if (!root) return;
  root.innerHTML = "";
  const q = document.createElement("p");
  q.className = "quiz-question";
  q.textContent = question;
  root.appendChild(q);

  const opts = document.createElement("div");
  opts.className = "quiz-options";
  const feedback = document.createElement("p");
  feedback.className = "quiz-feedback";
  feedback.hidden = true;

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      for (const b of opts.querySelectorAll("button")) {
        b.disabled = true;
        if (b === btn) b.classList.add(opt.correct ? "correct" : "wrong");
        else if (options.find((o) => o.label === b.textContent)?.correct)
          b.classList.add("correct");
      }
      feedback.hidden = false;
      feedback.textContent = explain;
    });
    opts.appendChild(btn);
  });

  root.appendChild(opts);
  root.appendChild(feedback);
}

const currentDateEl = document.getElementById("current-date");
const completedCount = document.getElementById("completed-count");
const allBtnEl = document.getElementById("allBtn");
const activeBtnEl = document.getElementById("activeBtn");
const doneBtnEl = document.getElementById("doneBtn");
const clearBtnEl = document.getElementById("clearBtn");
const todoItemsEl = document.getElementById("todo-items");
const frmTodo = document.forms.frmTodo;

const STORAGE_KEY = "todos";

// 사용자가 입력한 문자열을 HTML로 해석하지 않도록 특수 문자를 바꾼다.
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const todo = {
    items: [], // 할 일 객체들을 보관하는 배열
    tpl: null, // HTML 템플릿을 한 번 읽어 둔 뒤 재사용할 변수
    filter: "all", // 현재 선택된 탭 (all | active | done)

    all() {
        return this.items;
    },

    active() { // 완료되지 않은 task 조회
        return this.items.filter((item) => !item.done);
    },

    done() { // 완료된 task 조회
        return this.items.filter((item) => item.done);
    },

    get(uid) {
        return this.items.find((item) => item.uid === Number(uid));
    },

    // 현재 탭에 맞는 목록을 돌려준다.
    visible() {
        return this[this.filter]();
    },

    // 같은 밀리초에 연속으로 추가해도 번호가 겹치지 않게 한다.
    createUid() {
        const lastUid = this.items.reduce((max, item) => Math.max(max, item.uid), 0);
        return Math.max(Date.now(), lastUid + 1);
    },

    add(content) {
        this.items.push({ // 새 할 일 객체를 배열 끝에 추가
            uid: this.createUid(), // 항목마다 구별할 번호
            content,
            done: false, // 새 할 일은 아직 미완료 상태
        });
        this.commit();
    },

    edit(uid) { // task 수정
        const item = this.get(uid);
        if (!item) return;

        const editText = prompt("Edit item...", item.content);
        if (editText === null) return; // 취소하면 그대로 둔다.

        const content = editText.trim();
        if (!content) {
            alert("Enter task");
            return;
        }

        item.content = content;
        this.commit();
    },

    remove(uid) { // task 삭제
        this.items = this.items.filter((item) => item.uid !== Number(uid));
        this.commit();
    },

    clearCompleted() {
        this.items = this.active();
        this.commit();
    },

    changeBox(uid) {
        const item = this.get(uid);
        if (!item) return;

        item.done = !item.done;
        this.commit();
    },

    setFilter(filter) {
        this.filter = filter;
        this.render();
    },

    // 변경 사항을 저장하고 화면을 다시 그린다.
    commit() {
        this.save();
        this.render();
    },

    save() {
        // localStorage는 문자열만 저장하므로 배열을 JSON 문자열로 바꾼다.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    },

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            this.items = Array.isArray(saved) ? saved : [];
        } catch (error) {
            // 저장된 값이 손상된 경우 빈 목록으로 시작한다.
            this.items = [];
        }
    },

    getTpl() {
        if (!this.tpl) {
            this.tpl = document.getElementById("tpl-item").innerHTML;
        }
        return this.tpl;
    },

    renderItem({ uid, content, done }) {
        // 함수형 replacer를 써서 "$&" 같은 문자열도 그대로 표시되게 한다.
        return this.getTpl()
            .replace(/\$\{uid\}/g, () => uid)
            .replace(/\$\{content\}/g, () => escapeHtml(content))
            .replace(/\$\{checked\}/g, () => (done ? "checked" : ""));
    },

    render() {
        const completed = this.done().length;
        completedCount.textContent = `${completed} task completed`;

        const list = this.visible();
        if (list.length === 0) {
            todoItemsEl.innerHTML = '<ul><li class="text-center">no task :/</li></ul>';
            return;
        }

        todoItemsEl.innerHTML = list.map((item) => this.renderItem(item)).join("");
    },
};

window.addEventListener("DOMContentLoaded", function () {
    currentDateEl.textContent = new Date().toDateString();

    todo.load();
    todo.render();

    // task 추가
    frmTodo.addEventListener("submit", function (e) {
        e.preventDefault();
        const content = frmTodo.todoText.value.trim();
        if (!content) {
            alert("Enter task");
            frmTodo.todoText.value = "";
            frmTodo.todoText.focus();
            return;
        }

        todo.add(content);

        frmTodo.todoText.value = "";
        frmTodo.todoText.focus();
    });

    // task 편집·삭제 (이벤트 위임)
    todoItemsEl.addEventListener("click", function (e) {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const { action, uid } = button.dataset;
        if (action === "edit") todo.edit(uid);
        if (action === "remove") todo.remove(uid);
    });

    // checkbox toggle (이벤트 위임)
    todoItemsEl.addEventListener("change", function (e) {
        const box = e.target.closest('[data-action="toggle"]');
        if (!box) return;

        todo.changeBox(box.dataset.uid);
    });

    // 완료된 task 삭제
    clearBtnEl.addEventListener("click", function () {
        todo.clearCompleted();
    });

    // 탭 전환: 선택한 탭은 추가·수정·삭제 후에도 유지된다.
    allBtnEl.addEventListener("click", () => todo.setFilter("all"));
    activeBtnEl.addEventListener("click", () => todo.setFilter("active"));
    doneBtnEl.addEventListener("click", () => todo.setFilter("done"));
});

const default_config = {
    "stroke_order_font": false,
    "prompt": "japanese",
};
const default_card = {
    "japanese": "完全",
    "english": "complete",
    "furigana": "完[か]全[ぜん]",
    "kana": "かんぜん",
    "answer": "XXXXX"
}
var current_answer_id = "answer";
var deck_name, deck_size, deck_offset;
var current_answer_value = default_card["answer"];
var current_card_index = 0;
var max_card_index = 0;
var card_set = [];
var card_info = {
    "show-audio": false,
    "show-japanese": true,
    "show-furigana": false,
    "show-english": false,
    "show-kana": false,
}
var focus_input = true;
var input_mode = "text";

function get_deck_options_hash() {
    [deck_name, deck_size, deck_offset] = window.location.hash.replace('#', '').split(',');
    let deck_select = document.getElementById("deck-select");
    deck_select.value = deck_name;
    let deck_size_select = document.getElementById("deck-size-select");
    deck_size_select.value = deck_size;
    let deck_offset_input = document.getElementById("deck-offset");
    deck_offset_input.value = deck_offset;
}

function get_randomize(argument) {
    let randomize = document.getElementById("randomize");
    return randomize.checked
}

function set_progress(progress_value) {
    let progress = document.getElementById('progress');
    progress.innerHTML = progress_value;
}

function set_deck_options_hash() {
    let deck_select = document.getElementById("deck-select");
    deck_name = deck_select.options[deck_select.selectedIndex].value;
    let deck_size_select = document.getElementById("deck-size-select");
    deck_size = parseInt(deck_size_select.options[deck_size_select.selectedIndex].value);
    let deck_offset_input = document.getElementById("deck-offset");
    deck_offset = parseInt(deck_offset_input.value);
    window.location.hash = [deck_name, deck_size, deck_offset].join(',')
}

function load_deck_options() {
    [deck_name, deck_size, deck_offset] = window.location.hash.replace('#', '').split(',');
    deck_size = parseInt(deck_size);
    deck_offset = parseInt(deck_offset);
    if (deck_name in decks) {
        set_cards(deck_name, deck_size, deck_offset);
    }
}

function toggle_card_info() {
    for (const [key, value] of Object.entries(card_info)) {
        let hint = document.getElementById(key);
        card_info[key] = hint.checked;
    }
    reset_card_info();
}

function reset_card_info() {
    for (const [key, value] of Object.entries(card_info)) {
        if (value) {
            show_card_info(key);
        } else {
            hide_card_info(key);
        }
    }

}

function hide_card_info(card_info_id) {
    let hint = document.getElementById(card_info_id.replace('show-', 'card-'));
    hint.style.display = "none";
}

function show_card_info(card_info_id) {
    let hint = document.getElementById(card_info_id.replace('show-', 'card-'));
    hint.style.display = "block";

}

function temporarily_show_card_info() {
    for (const [key, value] of Object.entries(card_info)) {
        let hint = document.getElementById(key.replace('show-', 'card-'));
        if (hint.style.display === "none") {
            hint.style.display = "block";
        }
    }
}

function answer_id() {
    return "answer-" + Date.now().toString()
}

function set_japanese_font(stroke_order_font) {
    let card_furigana = document.getElementById('card-furigana');
    if (stroke_order_font) {
        card_furigana.style = 'font-family:"kanji"; font-size:100px; padding:10px; margin:10px;';
    } else {
        card_furigana.style = '';
    }

}

function set_cards(deck_name, deck_size, deck_offset) {
    let deck = decks[deck_name];
    set_japanese_font(deck['config']['stroke_order_font']);
    for (const [key, value] of Object.entries(card_info)) {
        if (key.replace('show-', '') === deck['config']['prompt']) {
            card_info[key] = true;
            let hint = document.getElementById(key);
            hint.checked = true;
        } else {
            // card_info[key] = false;
            // let hint = document.getElementById(key);
            // hint.checked = false;
        }
    }
    focus_input = deck['config']['focus_input'];
    input_mode = deck['config']['input_mode'];
    card_set = deck['cards'].slice(deck_offset - 1, deck_offset - 1 + deck_size);
    if (get_randomize()) {
        card_set = shuffle(card_set);
    }
    max_card_index = card_set.length - 1;
    current_card_index = 0;
    set_progress(current_card_index + 1);

    set_card_text(card_set[0]);
    set_answer(card_set[0]["answer"]);
}

function set_card_text(card) {
    let card_japanese = document.getElementById("card-japanese");
    card_japanese.innerHTML = card["japanese"];
    let card_furigana = document.getElementById("card-furigana");
    card_furigana.innerHTML = card["furigana"];
    let card_english = document.getElementById("card-english");
    card_english.innerHTML = card["english"];
    let card_kana = document.getElementById("card-kana");
    card_kana.innerHTML = card["kana"];
    if ("audio" in card) {
        let card_audio_player = document.getElementById("card-audio-player");
        let card_audio_source = document.getElementById("card-audio-source");
        card_audio_source.src = card["audio"];
        card_audio_player.load();
        card_audio_player.play();
    }
    reset_card_info();
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
    return array
}

function set_answer(answer_text) {
    let answer_container = document.getElementById("answer-container");
    let current_answer = document.getElementById(current_answer_id);
    let new_answer_id = answer_id();
    let new_answer = document.createElement("input");
    let fake_input = document.createElement("input");
    new_answer.type = "text";
    new_answer.setAttribute("id", new_answer_id);
    new_answer.setAttribute("onkeyup", "check_answer();");
    new_answer.setAttribute("inputmode", input_mode);
    answer_container.removeChild(current_answer);
    answer_container.appendChild(new_answer);
    current_answer_id = new_answer_id;
    current_answer_value = answer_text;
    if (focus_input) {
        // Hack to get iOS to focus on new input.
        fake_input.setAttribute('type', 'text');
        fake_input.style.position = 'absolute';
        fake_input.style.opacity = 0;
        fake_input.style.height = 0;
        document.body.prepend(fake_input);
        fake_input.focus();
        setTimeout(() => {
            new_answer.focus()
            fake_input.remove()
        }, 100)
    }
}

function check_answer() {
    let answer = document.getElementById(current_answer_id);
    if (current_answer_value === answer.value) {
        next_question()
    }
}

function next_question() {
    current_card_index += 1;
    set_progress(current_card_index + 1);
    if (current_card_index <= max_card_index) {
        set_card_text(card_set[current_card_index]);
        set_answer(card_set[current_card_index]["answer"]);
    } else {
        set_card_text(default_card);
        set_answer(default_card["answer"]);
    }
}

function init_flashcards(argument) {
    get_deck_options_hash();
    set_deck_options_hash();
    load_deck_options();
}

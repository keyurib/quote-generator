export type Category = "wisdom" | "courage" | "code" | "humor" | "life";

export interface Quote {
  id: number;
  text: string;
  author: string;
  category: Category;
}

export const CATEGORIES: { value: Category | "all"; label: string; color: string }[] = [
  { value: "all", label: "ALL", color: "var(--foreground)" },
  { value: "wisdom", label: "WISDOM", color: "#3fd0ff" },
  { value: "courage", label: "COURAGE", color: "#ff5a4e" },
  { value: "code", label: "CODE", color: "#7cff6b" },
  { value: "humor", label: "HUMOR", color: "#ffd23f" },
  { value: "life", label: "LIFE", color: "#b27cff" },
];

const RAW: Omit<Quote, "id">[] = [
  // WISDOM
  { category: "wisdom", author: "Socrates", text: "The unexamined life is not worth living." },
  { category: "wisdom", author: "Will Durant", text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit." },
  { category: "wisdom", author: "Seneca", text: "It is not that we have a short time to live, but that we waste a lot of it." },
  { category: "wisdom", author: "Marcus Aurelius", text: "Waste no more time arguing about what a good man should be. Be one." },
  { category: "wisdom", author: "Lao Tzu", text: "The journey of a thousand miles begins with one step." },
  { category: "wisdom", author: "Albert Einstein", text: "Imagination is more important than knowledge." },
  { category: "wisdom", author: "Søren Kierkegaard", text: "Life can only be understood backwards; but it must be lived forwards." },
  { category: "wisdom", author: "Friedrich Nietzsche", text: "He who has a why to live can bear almost any how." },
  { category: "wisdom", author: "Confucius", text: "It does not matter how slowly you go as long as you do not stop." },

  // COURAGE
  { category: "courage", author: "Franklin D. Roosevelt", text: "The only thing we have to fear is fear itself." },
  { category: "courage", author: "Wayne Gretzky", text: "You miss 100% of the shots you don't take." },
  { category: "courage", author: "Louisa May Alcott", text: "I am not afraid of storms, for I am learning how to sail my ship." },
  { category: "courage", author: "Japanese Proverb", text: "Fall seven times, stand up eight." },
  { category: "courage", author: "Samuel Beckett", text: "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better." },
  { category: "courage", author: "Salvador Dalí", text: "Have no fear of perfection — you'll never reach it." },
  { category: "courage", author: "Marie Curie", text: "Nothing in life is to be feared, it is only to be understood." },
  { category: "courage", author: "Ernest Hemingway", text: "Courage is grace under pressure." },
  { category: "courage", author: "Amelia Earhart", text: "The most difficult thing is the decision to act, the rest is merely tenacity." },

  // CODE
  { category: "code", author: "Linus Torvalds", text: "Talk is cheap. Show me the code." },
  { category: "code", author: "Harold Abelson", text: "Programs must be written for people to read, and only incidentally for machines to execute." },
  { category: "code", author: "Donald Knuth", text: "Premature optimization is the root of all evil." },
  { category: "code", author: "Edsger W. Dijkstra", text: "Simplicity is prerequisite for reliability." },
  { category: "code", author: "Alan Kay", text: "The best way to predict the future is to invent it." },
  { category: "code", author: "Arthur C. Clarke", text: "Any sufficiently advanced technology is indistinguishable from magic." },
  { category: "code", author: "Kent Beck", text: "Make it work, make it right, make it fast." },
  { category: "code", author: "Phil Karlton", text: "There are only two hard things in Computer Science: cache invalidation and naming things." },
  { category: "code", author: "Brian Kernighan", text: "Debugging is twice as hard as writing the code in the first place." },
  { category: "code", author: "Grace Hopper", text: "The most dangerous phrase in the language is: we've always done it this way." },

  // HUMOR
  { category: "humor", author: "Oscar Wilde", text: "I am so clever that sometimes I don't understand a single word of what I am saying." },
  { category: "humor", author: "Douglas Adams", text: "I love deadlines. I love the whooshing noise they make as they go by." },
  { category: "humor", author: "Terry Pratchett", text: "The trouble with having an open mind, of course, is that people will insist on coming along and trying to put things in it." },
  { category: "humor", author: "Steve Martin", text: "A day without sunshine is like, you know, night." },
  { category: "humor", author: "Mark Twain", text: "Never put off till tomorrow what may be done day after tomorrow just as well." },
  { category: "humor", author: "Douglas Adams", text: "Don't Panic." },
  { category: "humor", author: "Groucho Marx", text: "I refuse to join any club that would have me as a member." },
  { category: "humor", author: "Oscar Wilde", text: "I can resist everything except temptation." },

  // LIFE
  { category: "life", author: "John Lennon", text: "Life is what happens to you while you're busy making other plans." },
  { category: "life", author: "J.R.R. Tolkien", text: "Not all those who wander are lost." },
  { category: "life", author: "J.R.R. Tolkien", text: "All we have to decide is what to do with the time that is given us." },
  { category: "life", author: "J.K. Rowling", text: "It does not do to dwell on dreams and forget to live." },
  { category: "life", author: "Maya Angelou", text: "You can't use up creativity. The more you use, the more you have." },
  { category: "life", author: "Steve Jobs", text: "Stay hungry. Stay foolish." },
  { category: "life", author: "Maria Montessori", text: "Play is the work of the child." },
  { category: "life", author: "Robert Frost", text: "In three words I can sum up everything I've learned about life: it goes on." },
  { category: "life", author: "Dalai Lama", text: "Happiness is not something ready made. It comes from your own actions." },
];

export const QUOTES: Quote[] = RAW.map((q, i) => ({ ...q, id: i + 1 }));

export function categoryMeta(c: Category | "all") {
  return CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[0];
}

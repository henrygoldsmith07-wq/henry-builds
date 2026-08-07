export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  category: string;
  status: string;
  tags: string[];
  accent: string;
  preview: "revise" | "fitness" | "food" | "language" | "calendar" | "studio";
  problem: string;
  idea: string;
  features: string[];
  technology: string[];
  improving: string;
};

export const projects: Project[] = [
  {
    slug: "revise",
    name: "Revise",
    eyebrow: "A better way to revise.",
    description: "An all-in-one learning platform exploring how active recall, spaced repetition, past papers, planning and AI can work together in one revision experience.",
    category: "Learning / AI / Productivity",
    status: "In progress",
    tags: ["Learning", "AI", "Productivity", "Education"],
    accent: "#d8e5ff",
    preview: "revise",
    problem: "Revision tools often make students stitch together several disconnected workflows.",
    idea: "Bring the useful parts of studying into one calm, focused place that adapts to how someone learns.",
    features: ["Active recall", "Spaced repetition", "Revision planning", "AI-powered learning"],
    technology: ["React", "TypeScript", "Product design"],
    improving: "Making the experience feel lighter while adding more useful context around each session.",
  },
  {
    slug: "arise-fitness",
    name: "Arise Fitness",
    eyebrow: "Training, made easier to return to.",
    description: "A fitness application focused on workouts, progress tracking and exercise data that helps people improve their training over time.",
    category: "Fitness / Tracking",
    status: "Exploring",
    tags: ["Fitness", "Data", "Habits"],
    accent: "#dceadf",
    preview: "fitness",
    problem: "Fitness tracking can become more about recording data than understanding progress.",
    idea: "Make the next useful action obvious, from starting a workout to noticing a small improvement.",
    features: ["Workout logging", "Progress snapshots", "Exercise library", "Training history"],
    technology: ["React", "Data visualisation", "Interaction design"],
    improving: "Finding the right balance between detailed data and a motivating, low-friction routine.",
  },
  {
    slug: "food-shopping-os",
    name: "Food Shopping OS",
    eyebrow: "A calmer way to plan the week.",
    description: "A nutrition, meal-planning and food-shopping platform designed to make choosing meals and buying food feel more connected.",
    category: "Nutrition / Organisation",
    status: "Exploring",
    tags: ["Nutrition", "Planning", "Systems"],
    accent: "#f0e5cf",
    preview: "food",
    problem: "Meal planning is usually spread across recipes, notes, lists and last-minute decisions.",
    idea: "Turn a loose intention to eat well into a simple plan that naturally becomes a shopping list.",
    features: ["Meal planning", "Smart shopping lists", "Nutrition overview", "Reusable routines"],
    technology: ["Product systems", "UI/UX", "Rapid prototyping"],
    improving: "Making planning feel flexible enough for real weeks, not just ideal ones.",
  },
  {
    slug: "french-practice",
    name: "French Practice",
    eyebrow: "Practice that keeps moving.",
    description: "A language-learning application focused on making French practice more interactive, useful and easier to return to.",
    category: "Language / Learning",
    status: "Experiment",
    tags: ["Language", "Learning", "Interaction"],
    accent: "#e4dcf0",
    preview: "language",
    problem: "Language practice is easy to postpone when every session feels like starting from zero.",
    idea: "Create small, varied moments of practice that build confidence without adding pressure.",
    features: ["Interactive prompts", "Vocabulary practice", "Progress loops", "Short sessions"],
    technology: ["React", "Learning design", "Prototyping"],
    improving: "Exploring how feedback and repetition can feel more like conversation than homework.",
  },
  {
    slug: "chrono-calendar",
    name: "Chrono Calendar",
    eyebrow: "More intention in your time.",
    description: "A modern calendar and productivity application designed around planning, organisation and managing time with less friction.",
    category: "Calendar / Productivity",
    status: "Experiment",
    tags: ["Calendar", "Planning", "Focus"],
    accent: "#dce9ec",
    preview: "calendar",
    problem: "Calendars show what is happening, but rarely help make the shape of a week feel understandable.",
    idea: "Make time easier to see, shape and protect without turning planning into another task.",
    features: ["Time blocks", "Week overview", "Focus planning", "Clear priorities"],
    technology: ["React", "TypeScript", "Interface systems"],
    improving: "Working out how much structure is useful before it starts feeling restrictive.",
  },
  {
    slug: "le-studio",
    name: "Le Studio",
    eyebrow: "A space for visual experiments.",
    description: "A design-focused project and an important influence on the visual language I like: quiet, considered and full of small details.",
    category: "Design / Visual systems",
    status: "Ongoing",
    tags: ["Design", "Visual systems", "Experiments"],
    accent: "#e9e7e2",
    preview: "studio",
    problem: "Good visual ideas can disappear when they have nowhere to be collected and tested.",
    idea: "Use a small studio as a place to explore typography, layouts and product details without a fixed brief.",
    features: ["Visual studies", "Type experiments", "Layout explorations", "Design references"],
    technology: ["UI/UX", "Art direction", "Visual design"],
    improving: "Keeping the work expressive while making each experiment useful for future products.",
  },
];

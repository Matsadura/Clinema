import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrolling; Layout scrolls to top on navigation.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

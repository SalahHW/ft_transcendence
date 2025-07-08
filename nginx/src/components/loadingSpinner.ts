export function loadingSpinnerHTML({ id = "" } = {}): string {
  return `
    <div id="${id}" class="my-4 flex justify-center hidden">
      <div class="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
    </div>
  `;
}

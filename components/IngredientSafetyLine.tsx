/**
 * The one-line reminder that sits beside every ingredient list.
 *
 * One component rather than the same sentence copied into each view, so it
 * cannot drift out of step between the meal modal, the recipe card, the print
 * sheet and the token-authenticated pages a household reaches from the Sunday
 * email.
 */
export default function IngredientSafetyLine({ style }: { style?: React.CSSProperties }) {
  return (
    <p className="text-xs italic mt-2 mb-3" style={{ color: 'var(--text-3)', ...style }}>
      Recipes are AI-generated and avoid the ingredients you&apos;ve listed — but check
      every ingredient and label before you cook.
    </p>
  );
}

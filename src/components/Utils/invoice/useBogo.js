// src/hooks/useBogo.js
import { useState, useEffect, useCallback } from "react";
import { BOGO_ELIGIBLE_PRODUCTS } from "./BOGO_ELIGIBLE_PRODUCTS";

/**
 * useBogo 
 *  - manages whether BOGO is enabled (only on Thursdays),
 *  - and exposes an `applyBogo` fn that, given your current cart array,
 *    returns a new array with any free items added.
 */
export function useBogo() {
  const [bogoEnabled, setBogoEnabled] = useState(false);
  const [isThursday, setIsThursday] = useState(false);

  useEffect(() => {
    const checkDay = () => {
      const today = new Date().getDay();
      const THURSDAY = 4;
      const isThu = today === THURSDAY;
      setIsThursday(isThu);
      setBogoEnabled(isThu);
    };

    checkDay();
    const id = setInterval(checkDay, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const applyBogo = useCallback(
    (items) => {
      if (!bogoEnabled) return items;

      // Clone array so we don’t mutate
      const updated = [...items];

      // For each eligible product, if no free copy exists, add it
      items.forEach((prod) => {
        const eligibleSizes = BOGO_ELIGIBLE_PRODUCTS[prod.name];
        const size = prod.size?.toLowerCase();
        if (eligibleSizes && (!size || eligibleSizes.includes(size))) {
          const alreadyFree = updated.some(
            (p) => p.name === prod.name && p.size === prod.size && p.isFree
          );
          if (!alreadyFree) {
            updated.push({
              ...prod,
              price: 0,
              originalPrice: prod.price,
              isFree: true,
              quantity: prod.quantity,
            });
          }
        }
      });

      return updated;
    },
    [bogoEnabled]
  );

   // expose a toggle function you can call from the checkbox
  const toggleBogo = useCallback(() => {
    if (isThursday) setBogoEnabled((e) => !e);
  }, [isThursday]);

  return { bogoEnabled, isThursday, applyBogo, toggleBogo };
}

import { useEffect, useRef } from "react";

/**
 * Evita atualização de estado depois que o componente foi desmontado.
 * Útil em telas com carregamento assíncrono e navegação rápida.
 */
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}

export default useMountedRef;

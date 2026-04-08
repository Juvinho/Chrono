import { useEffect, useRef } from 'react';

interface FormField {
  current: HTMLInputElement | null;
  id: string;
}

interface UseFormNavigationProps {
  fields: FormField[];
  onSubmit?: () => void;
  submitOnLastField?: boolean;
}

/**
 * Hook para navegação de formulário com tecla Enter
 * Permite ao usuário navegar entre campos pressionando Enter
 * 
 * @param fields - Array de refs dos campos do formulário
 * @param onSubmit - Função a executar quando pressionar Enter no último campo
 * @param submitOnLastField - Se deve submeter ao atingir o último campo (padrão: false)
 * 
 * @example
 * const emailRef = useRef<HTMLInputElement>(null);
 * const passwordRef = useRef<HTMLInputElement>(null);
 * 
 * useFormNavigation(
 *   [
 *     { current: emailRef.current, id: 'email' },
 *     { current: passwordRef.current, id: 'password' }
 *   ],
 *   () => handleSubmit(),
 *   true
 * );
 */
export const useFormNavigation = ({
  fields,
  onSubmit,
  submitOnLastField = false,
}: UseFormNavigationProps) => {
  const fieldRefsRef = useRef<FormField[]>(fields);

  useEffect(() => {
    fieldRefsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Apenas processar tecla Enter
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLInputElement;
      if (!target) return;

      // Encontrar o índice do campo atual
      const currentIndex = fieldRefsRef.current.findIndex(
        (field) => field.current === target
      );

      if (currentIndex === -1) return;

      // Se for o último campo
      if (currentIndex === fieldRefsRef.current.length - 1) {
        e.preventDefault();
        if (submitOnLastField && onSubmit) {
          onSubmit();
        }
        return;
      }

      // Não é o último campo, focar no próximo
      e.preventDefault();
      const nextField = fieldRefsRef.current[currentIndex + 1];
      if (nextField?.current) {
        nextField.current.focus();
      }
    };

    // Adicionar listeners a todos os campos
    const cleanups: (() => void)[] = [];
    fieldRefsRef.current.forEach((field) => {
      if (field.current) {
        field.current.addEventListener('keypress', handleKeyPress);
        cleanups.push(() => {
          if (field.current) {
            field.current.removeEventListener('keypress', handleKeyPress);
          }
        });
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [onSubmit, submitOnLastField]);
};

export default useFormNavigation;

import Ajv from 'ajv';
import { badRequest } from './http';

/**
 * Instancia de AJV (Another JSON Validator) para validación de esquemas JSON
 */
const ajv = new Ajv();

/**
 * Valida un objeto de datos contra un esquema JSON definido
 * @template T - Tipo esperado del objeto validado
 * @param schema - Esquema JSON contra el cual validar
 * @param data - Datos a validar
 * @returns Los datos validados con el tipo T
 * @throws Respuesta HTTP 400 si la validación falla
 */
export const validate = <T>(schema: object, data: any): T => {
  const validateFn = ajv.compile(schema);
  if (!validateFn(data)) {
    throw badRequest('Invalid payload');
  }
  return data as T;
};

/**
 * Respuesta HTTP exitosa (200 OK)
 * @param body - Datos a retornar en la respuesta
 * @returns Objeto con statusCode 200 y body serializado
 */
export const ok = (body: any) => ({
  statusCode: 200,
  body: JSON.stringify(body),
});

/**
 * Respuesta HTTP de recurso creado exitosamente (201 Created)
 * @param body - Datos del recurso creado
 * @returns Objeto con statusCode 201 y body serializado
 */
export const created = (body: any) => ({
  statusCode: 201,
  body: JSON.stringify(body),
});

/**
 * Respuesta HTTP de petición incorrecta (400 Bad Request)
 * @param msg - Mensaje de error descriptivo
 * @returns Objeto con statusCode 400 y mensaje de error
 */
export const badRequest = (msg: string) => ({
  statusCode: 400,
  body: JSON.stringify({ error: msg }),
});

/**
 * Respuesta HTTP de recurso no encontrado (404 Not Found)
 * @param msg - Mensaje de error descriptivo
 * @returns Objeto con statusCode 404 y mensaje de error
 */
export const notFound = (msg: string) => ({
  statusCode: 404,
  body: JSON.stringify({ error: msg }),
});

/**
 * Respuesta HTTP de error interno del servidor (500 Internal Server Error)
 * @param msg - Mensaje de error descriptivo
 * @returns Objeto con statusCode 500 y mensaje de error
 */
export const serverError = (msg: string) => ({
  statusCode: 500,
  body: JSON.stringify({ error: msg }),
});

/**
 * Respuesta HTTP de no autorizado (401 Unauthorized)
 * @param msg - Mensaje de error descriptivo
 * @returns Objeto con statusCode 401 y mensaje de error
 */
export const unauthorized = (msg: string) => ({
  statusCode: 401,
  body: JSON.stringify({ error: msg }),
});

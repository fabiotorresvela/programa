import type { Course } from '../types';

/** Contenido original de práctica comercial. No reproduce texto de libros protegidos. */
export const courses: Course[] = [
  {
    id: 'ruta-vendedor',
    title: 'Ruta del vendedor',
    subtitle: 'Pasos, frases y práctica para cerrar mejor',
    tag: 'Ventas',
    coverTone: 'forest',
    description:
      'Audio corto para conducir o esperar: resumen de cada etapa, frases útiles y un ejercicio que puedes repetir en voz alta.',
    sections: [
      {
        id: 'apertura',
        title: '1. Apertura con propósito',
        durationLabel: '4 min',
        summary:
          'No empieces vendiendo el producto. Empieza aclarando por qué estás ahí y qué problema quieres ayudar a resolver.',
        keyPoints: [
          'Saludo breve + nombre + motivo concreto',
          'Pregunta de permiso: “¿Te viene bien un minuto?”',
          'Una frase de valor, no un discurso',
        ],
        practice:
          'Di en voz alta: “Hola, soy [nombre]. Te contacto porque ayudo a [resultado]. ¿Te viene bien un minuto?”',
        script:
          'Sección uno. Apertura con propósito. Recuerda: la primera impresión no es el catálogo, es la claridad. Saluda, di tu nombre, explica el motivo en una sola frase y pide permiso. Ejemplo: Hola, soy Fabio. Ayudo a negocios a recuperar clientes que ya compraron una vez. ¿Te viene bien un minuto? Practica esa estructura hasta que suene natural, no leída.',
      },
      {
        id: 'diagnostico',
        title: '2. Diagnóstico, no monólogo',
        durationLabel: '5 min',
        summary:
          'Las mejores ventas empiezan escuchando. Haz preguntas que revelen dolor, urgencia y presupuesto emocional.',
        keyPoints: [
          'Pregunta abierta: situación actual',
          'Pregunta de impacto: qué les cuesta no resolverlo',
          'Calla dos segundos después de la respuesta',
        ],
        practice:
          'Haz tres preguntas: qué pasa hoy, desde cuándo, y qué han intentado. Escucha sin interrumpir.',
        script:
          'Sección dos. Diagnóstico, no monólogo. Tu meta no es hablar más, es entender más. Pregunta por la situación actual, desde cuándo ocurre y qué han intentado. Luego pregunta el impacto: ¿qué les cuesta seguir así? Después de cada respuesta, espera en silencio dos segundos. Ahí suele aparecer la verdad útil para vender con sentido.',
      },
      {
        id: 'propuesta',
        title: '3. Propuesta en tres líneas',
        durationLabel: '4 min',
        summary:
          'Traduce lo que escuchaste a una oferta simple: problema, camino y resultado medible.',
        keyPoints: [
          '“Por lo que me cuentas…”',
          'Una solución, no cinco opciones confusas',
          'Resultado visible en tiempo concreto',
        ],
        practice:
          'Arma: problema + solución + resultado en 20 segundos. Grábate y escúchate.',
        script:
          'Sección tres. Propuesta en tres líneas. Usa esta plantilla: por lo que me cuentas, el problema principal es X. Lo que propongo es Y. El resultado que buscamos en las próximas semanas es Z. Una solución clara vence a un menú largo. Si el cliente se confunde, no compra.',
      },
      {
        id: 'objeciones',
        title: '4. Objeciones sin pelear',
        durationLabel: '5 min',
        summary:
          'Una objeción no es un no final. Es información. Aclara, valida y reencuadra el valor.',
        keyPoints: [
          'Valida: “Tiene sentido”',
          'Aclara qué significa “está caro”',
          'Compara costo vs. costo de no actuar',
        ],
        practice:
          'Responde a “está caro” con: validación + pregunta + ancla de valor. Repítelo tres veces.',
        script:
          'Sección cuatro. Objeciones sin pelear. Cuando digan está caro, no te pongas a la defensiva. Valida: tiene sentido cuidarlo. Luego aclara: ¿caro respecto a qué alternativa? Después ancla el valor: si esto te ahorra o te genera X al mes, el costo se mira distinto. Practica tono calmado. La calma vende más que la prisa.',
      },
      {
        id: 'cierre',
        title: '5. Cierre y seguimiento',
        durationLabel: '4 min',
        summary:
          'Pide el siguiente paso concreto: fecha, monto o decisión. Luego da seguimiento sin acosar.',
        keyPoints: [
          'Cierre de siguiente paso, no de presión',
          'Confirma fecha y responsable',
          'Seguimiento breve con valor nuevo',
        ],
        practice:
          'Cierra con: “¿Avanzamos con la opción A esta semana o prefieres revisar el jueves a las 10?”',
        script:
          'Sección cinco. Cierre y seguimiento. Un buen cierre ofrece una decisión clara, no presión. Pregunta: ¿avanzamos esta semana o revisamos el jueves a las diez? Confirma fecha, responsable y qué pasa después. Si no cierran hoy, el seguimiento debe aportar algo nuevo: un dato, un caso o un recordatorio útil. Así te vuelves presente, no pesado.',
      },
    ],
  },
  {
    id: 'habitos-ruta',
    title: 'Hábitos en la ruta',
    subtitle: 'Microprácticas para el día a día comercial',
    tag: 'Hábitos',
    coverTone: 'ink',
    description:
      'Bloques cortos para cuando estás en tránsito: disciplina, pipeline y energía mental.',
    sections: [
      {
        id: 'pipeline',
        title: 'Pipeline de 10 minutos',
        durationLabel: '3 min',
        summary:
          'Cada día, revisa tres contactos calientes, tres tibios y uno nuevo. Constancia gana a intensidad esporádica.',
        keyPoints: [
          '3 calientes: pedir avance',
          '3 tibios: aportar valor',
          '1 nuevo: abrir conversación',
        ],
        practice: 'Nombra en voz alta tus 3 calientes de hoy y el siguiente mensaje a cada uno.',
        script:
          'Hábitos en la ruta. Pipeline de diez minutos. Antes de llegar a tu siguiente parada, elige tres contactos calientes y define el siguiente mensaje. Luego tres tibios a los que les darás un aporte útil. Y uno nuevo para abrir. Si haces esto diario, tu embudo no depende del ánimo del día.',
      },
      {
        id: 'energia',
        title: 'Energía antes de la llamada',
        durationLabel: '3 min',
        summary:
          'Treinta segundos de postura, respiración y frase de intención cambian el tono de la conversación.',
        keyPoints: [
          'Hombros atrás, voz más baja y clara',
          'Una respiración larga',
          'Intención: ayudar, no empujar',
        ],
        practice: 'Antes de la próxima llamada: respira, di tu intención y sonríe al marcar.',
        script:
          'Energía antes de la llamada. Detente treinta segundos. Endereza hombros. Respira profundo. Di en voz baja: voy a ayudar a esta persona a decidir con claridad. Luego marca. Tu estado interno se escucha antes que tus argumentos.',
      },
    ],
  },
];

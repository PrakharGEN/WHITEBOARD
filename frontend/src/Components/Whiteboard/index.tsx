import { useEffect, useState, useLayoutEffect } from "react";
import rough from "roughjs/bin/rough";

const WhiteBoard = ({ canvasRef, ctxRef, elements, setElements, tool, color, user, socket }) => {
  const [img, setImg] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  // Set up canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    window.roughCanvas = rough.canvas(canvas);
  }, []);

  // Listen for whiteboard image updates from server
  useEffect(() => {
    const handleWhiteboardData = (data) => {
      setImg(data.imgURL); // fixed to access imgURL
    };

    socket.on("whiteBoardDataResponse", handleWhiteboardData);

    return () => {
      socket.off("whiteBoardDataResponse", handleWhiteboardData);
    };
  }, [socket]);

  // Draw on canvas (elements or image)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const roughCanvas = window.roughCanvas;

    // If viewer and image is present
    if (!user?.presenter && img) {
      const image = new Image();
      image.src = img;
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      return;
    }

    // Presenter drawing elements
    elements.forEach((el) => {
      if (el.type === "pencil") {
        ctx.beginPath();
        ctx.strokeStyle = el.stroke;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.moveTo(el.path[0][0], el.path[0][1]);
        for (let i = 1; i < el.path.length - 1; i++) {
          const midX = (el.path[i][0] + el.path[i + 1][0]) / 2;
          const midY = (el.path[i][1] + el.path[i + 1][1]) / 2;
          ctx.quadraticCurveTo(el.path[i][0], el.path[i][1], midX, midY);
        }
        ctx.stroke();
      } else if (el.roughElement) {
        roughCanvas.draw(el.roughElement);
      } else if (el.type === "text") {
        ctx.font = "16px Arial";
        ctx.fillStyle = el.color;
        ctx.textAlign = "center";
        ctx.fillText(el.text, el.x, el.y);
      } else if (el.type === "arrow") {
        ctx.strokeStyle = el.stroke;
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();

        const headlen = 10;
        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(
          el.x2 - headlen * Math.cos(angle - Math.PI / 6),
          el.y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          el.x2 - headlen * Math.cos(angle + Math.PI / 6),
          el.y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineTo(el.x2, el.y2);
        ctx.fillStyle = el.stroke;
        ctx.fill();
      }
    });

    // Send canvas image to server if presenter
    if (user?.presenter) {
      const canvasImage = canvas.toDataURL();
      socket.emit("whiteboardData", canvasImage);
    }
  }, [elements, img, user, socket]);

  const handleMouseDown = (e) => {
    if (!user?.presenter) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPoint({ offsetX, offsetY });

    if (tool === "pencil") {
      setElements((prev) => [
        ...prev,
        {
          type: "pencil",
          path: [[offsetX, offsetY]],
          stroke: color,
        },
      ]);
    }
  };

  const handleMouseMove = (e) => {
    if (!user?.presenter || !isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    if (tool === "pencil") {
      const index = elements.length - 1;
      const { path } = elements[index];
      const newPath = [...path, [offsetX, offsetY]];
      const updatedElement = { ...elements[index], path: newPath };
      const updatedElements = [...elements];
      updatedElements[index] = updatedElement;
      setElements(updatedElements);
    }
  };

  const handleMouseUp = (e) => {
    if (!user?.presenter) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setIsDrawing(false);

    if (tool === "line" || tool === "rectangle") {
      const { offsetX: x1, offsetY: y1 } = startPoint;
      const x2 = offsetX;
      const y2 = offsetY;
      const shape =
        tool === "line"
          ? rough.generator().line(x1, y1, x2, y2, { stroke: color })
          : rough.generator().rectangle(x1, y1, x2 - x1, y2 - y1, { stroke: color });

      setElements((prev) => [
        ...prev,
        {
          type: tool,
          x1,
          y1,
          x2,
          y2,
          stroke: color,
          roughElement: shape,
        },
      ]);
    }
  };

  const createGraph = (nodes) => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 150;
    const angleStep = (2 * Math.PI) / nodes;
    const newElements = [];
    const nodeCoords = [];

    for (let i = 0; i < nodes; i++) {
      const x = centerX + radius * Math.cos(i * angleStep);
      const y = centerY + radius * Math.sin(i * angleStep);
      nodeCoords.push({ x, y });
      newElements.push({
        type: "circle",
        x,
        y,
        roughElement: rough.generator().circle(x, y, 40, { stroke: color }),
      });
      newElements.push({
        type: "text",
        x,
        y,
        text: `N${i + 1}`,
        color,
      });
    }

    for (let i = 0; i < nodes; i++) {
      for (let j = i + 1; j < nodes; j++) {
        newElements.push({
          type: "arrow",
          x1: nodeCoords[i].x,
          y1: nodeCoords[i].y,
          x2: nodeCoords[j].x,
          y2: nodeCoords[j].y,
          stroke: color,
        });
      }
    }

    setElements((prev) => [...prev, ...newElements]);
  };

  const createBST = (nodes) => {
    const canvasWidth = canvasRef.current.width;
    const startX = canvasWidth / 2;
    const startY = 50;
    const levelGap = 80;
    const nodeGap = 40;
    const newElements = [];

    const build = (index, x, y, level) => {
      if (index > nodes) return;
      newElements.push({
        type: "circle",
        x,
        y,
        roughElement: rough.generator().circle(x, y, 40, { stroke: color }),
      });
      newElements.push({
        type: "text",
        x,
        y,
        text: `${index}`,
        color,
      });

      const offset = nodeGap * Math.pow(2, 3 - level);
      if (2 * index <= nodes) {
        newElements.push({
          type: "arrow",
          x1: x,
          y1: y,
          x2: x - offset,
          y2: y + levelGap,
          stroke: color,
        });
        build(2 * index, x - offset, y + levelGap, level + 1);
      }
      if (2 * index + 1 <= nodes) {
        newElements.push({
          type: "arrow",
          x1: x,
          y1: y,
          x2: x + offset,
          y2: y + levelGap,
          stroke: color,
        });
        build(2 * index + 1, x + offset, y + levelGap, level + 1);
      }
    };

    build(1, startX, startY, 1);
    setElements((prev) => [...prev, ...newElements]);
  };

  useEffect(() => {
    window.createGraph = createGraph;
    window.createBST = createBST;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="border border-dark border-3 bg-white h-100 w-100"
    />
  );
};

export default WhiteBoard;
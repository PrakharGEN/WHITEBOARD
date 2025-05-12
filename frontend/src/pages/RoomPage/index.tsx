import { useState, useRef, useEffect } from "react";
import "./index.css";
import WhiteBoard from "../../Components/Whiteboard";

const RoomPage = ({ user, socket }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);
  const [usersCount, setUsersCount] = useState(0);

  useEffect(() => {
    // Listen for user count updates - this works for both presenter and viewer
    if (socket) {
      socket.on("updateUserCount", (data) => {
        console.log("Received user count update:", data.count);
        setUsersCount(data.count);
      });
      
      // Make sure to request current user count when component mounts
      // This is useful if the user joins when the count is already non-zero
      socket.emit("requestUserCount");
    }
    
    return () => {
      // Clean up listeners when component unmounts
      if (socket) {
        socket.off("updateUserCount");
      }
    };
  }, [socket]);

  const undo = () => {
    if (elements.length > 0) {
      const last = elements[elements.length - 1];
      setHistory([...history, last]);
      setElements(elements.slice(0, -1));
    }
  };

  const redo = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setElements([...elements, last]);
      setHistory(history.slice(0, -1));
    }
  };

  const clearCanvas = () => {
    setElements([]);
    setHistory([]);
  };

  const handleGraph = () => {
    const count = parseInt(prompt("Enter number of graph nodes:"));
    if (!isNaN(count)) {
      window.createGraph(count);
    }
  };

  const handleBST = () => {
    const count = parseInt(prompt("Enter number of BST nodes:"));
    if (!isNaN(count)) {
      window.createBST(count);
    }
  };

  const handleLinkedList = () => {
    const count = parseInt(prompt("Enter number of Linked List nodes:"));
    if (!isNaN(count)) {
      const canvas = canvasRef.current;
      const newElements = [];
      const startX = 50;
      const startY = canvas.height / 2;
      const spacing = 100;

      for (let i = 0; i < count; i++) {
        const x = startX + i * spacing;
        const y = startY;
        newElements.push({
          type: "rectangle",
          x1: x,
          y1: y - 20,
          x2: x + 60,
          y2: y + 20,
          stroke: color,
          roughElement: window.roughCanvas.generator.rectangle(x, y - 20, 60, 40, { stroke: color }),
        });
        newElements.push({
          type: "text",
          x: x + 30,
          y,
          text: `N${i + 1}`,
          color,
        });
        if (i > 0) {
          newElements.push({
            type: "arrow",
            x1: x - spacing + 60,
            y1: y,
            x2: x,
            y2: y,
            stroke: color,
          });
        }
      }
      setElements((prev) => [...prev, ...newElements]);
    }
  };

  return (
    <div className="row">
      <h1 className="text-center py-4">
        White Board Sharing App <span className="text-primary">[Users Online : {usersCount}]</span>
      </h1>

      {user?.presenter && (
        <div className="col-md-10 mx-auto px-5 mb-3 d-flex align-items-center justify-content-center">
          <div className="d-flex col-md-3 justify-content-center gap-2">
            <div className="d-flex gap-1 align-items-center">
              <label htmlFor="pencil">Pencil</label>
              <input
                type="radio"
                name="tool"
                id="pencil"
                checked={tool === "pencil"}
                value="pencil"
                onChange={(e) => setTool(e.target.value)}
              />
            </div>
            <div className="d-flex gap-1 align-items-center">
              <label htmlFor="line">Line</label>
              <input
                type="radio"
                name="tool"
                id="line"
                checked={tool === "line"}
                value="line"
                onChange={(e) => setTool(e.target.value)}
              />
            </div>
            <div className="d-flex gap-1 align-items-center">
              <label htmlFor="rectangle">Rectangle</label>
              <input
                type="radio"
                name="tool"
                id="rectangle"
                checked={tool === "rectangle"}
                value="rectangle"
                onChange={(e) => setTool(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3 mx-auto d-flex align-items-center justify-content-center">
            <label htmlFor="color">Select Color:</label>
            <input
              type="color"
              id="color"
              className="ms-3"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          <div className="col-md-4 d-flex gap-2">
            <button className="btn btn-primary" onClick={undo}>Undo</button>
            <button className="btn btn-outline-primary" onClick={redo}>Redo</button>
            <button className="btn btn-danger" onClick={clearCanvas}>Clear Canvas</button>
          </div>
        </div>
      )}

      {user?.presenter && (
        <div className="col-md-10 mx-auto mb-3 d-flex gap-2 justify-content-center">
          <button className="btn btn-secondary" onClick={handleGraph}>Create Graph</button>
          <button className="btn btn-secondary" onClick={handleBST}>Create BST</button>
          <button className="btn btn-secondary" onClick={handleLinkedList}>Create Linked List</button>
        </div>
      )}

      <div className="col-md-10 mx-auto mt-4 canvas-box">
        <WhiteBoard
          canvasRef={canvasRef}
          ctxRef={ctxRef}
          elements={elements}
          setElements={setElements}
          tool={tool}
          color={color}
          user={user}
          socket={socket}
        />
      </div>
    </div>
  );
};

export default RoomPage;
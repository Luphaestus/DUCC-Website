import { For } from "solid-js";
import Panel from "@/components/Panel";
import { FaSolidCar, FaSolidPlus, FaSolidPenToSquare, FaSolidXmark } from 'solid-icons/fa';
import type { Car } from "../types";

interface MyVehiclesPanelProps {
    cars: Car[];
    onAdd: () => void;
    onEdit: (car: Car) => void;
    onDelete: (id: number) => void;
}

export default function MyVehiclesPanel(props: MyVehiclesPanelProps) {
    return (
        <Panel
            title="My Vehicles"
            icon={FaSolidCar}
            class="glass-panel"
            action={
                <button class="small-btn primary" onClick={props.onAdd}>
                    <FaSolidPlus /> Add Car
                </button>
            }
        >
            <div class="item-list">
                <For each={props.cars} fallback={<p>No cars found.</p>}>
                    {(car) => (
                        <div class="list-item">
                            <div class="item-icon"><FaSolidCar /></div>
                            <div class="item-details">
                                <span class="item-title">{car.name}</span>
                                <span class="item-subtitle">{car.seats} Seats • {car.boats} Boats {car.is_global && <span class="badge primary">Global</span>}</span>
                            </div>
                            <div class="item-value-group">
                                <div class="button-group">
                                    <button class="small-btn icon-only secondary" onClick={() => props.onEdit(car)} title="Edit Car">
                                        <FaSolidPenToSquare />
                                    </button>
                                    <button class="small-btn icon-only delete" onClick={() => props.onDelete(car.id)} title="Remove Car">
                                        <FaSolidXmark />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </Panel>
    );
}
